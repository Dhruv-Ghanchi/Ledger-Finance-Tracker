import os
import re
import uuid
import tempfile

def _extract_text_from_pdf(tmp_path: str) -> str:
    """Fast extraction of embedded text from PDF without OCR, grouping words into lines."""
    try:
        import fitz
        text = ""
        with fitz.open(tmp_path) as doc:
            for page in doc:
                blocks = page.get_text("words")
                lines_dict = {}
                for w in blocks:
                    # y0 is w[1], y1 is w[3]
                    # Binning by Y coordinate (nearest 5 pixels) works well for tabular data
                    y = round(w[1] / 5) * 5 
                    if y not in lines_dict:
                        lines_dict[y] = []
                    lines_dict[y].append(w)
                
                for y in sorted(lines_dict.keys()):
                    words = sorted(lines_dict[y], key=lambda w: w[0])
                    line_str = " ".join(w[4] for w in words)
                    text += line_str + "\n"
                text += "\n"
        return text.strip()
    except Exception as e:
        print(f"Error extracting text from PDF: {e}")
        return ""

def _is_bank_statement(text: str) -> bool:
    lines = [line.strip() for line in text.split("\n") if line.strip()]
    date_patterns = [
        r"^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}",
        r"^\d{4}[/-]\d{1,2}[/-]\d{1,2}",
        r"^\d{1,2}\s+[A-Za-z]{3}\s+\d{2,4}", 
    ]
    
    date_line_count = 0
    for line in lines:
        for pattern in date_patterns:
            if re.search(pattern, line):
                # Ensure it has something that looks like an amount
                if re.search(r"[\d,]+\.\d{2}", line):
                    date_line_count += 1
                    break
    
    return date_line_count >= 3

def _extract_bank_statement_from_text(text: str) -> list[dict]:
    lines = [line.strip() for line in text.split("\n") if line.strip()]
    results = []
    
    date_patterns = [
        (r"^(\d{1,2})[/-](\d{1,2})[/-](\d{4})", "dmy4"),
        (r"^(\d{4})[/-](\d{1,2})[/-](\d{1,2})", "ymd4"),
        (r"^(\d{1,2})[/-](\d{1,2})[/-](\d{2})\b", "dmy2"),
        (r"^(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{2,4})", "dMonY"),
    ]
    
    from app.entries.routes import _infer_category, _try_parse_date
    
    for line in lines:
        parsed_date = None
        for pattern, fmt in date_patterns:
            match = re.search(pattern, line)
            if match:
                parsed_date = _try_parse_date(match.groups(), fmt)
                if parsed_date:
                    break
        
        if not parsed_date:
            continue
            
        amounts = re.findall(r"(?:[₹$£€¥\u20B9]\s*)?((?:\d{1,3},)*\d{1,3}\.\d{2})", line)
        if not amounts:
            continue
            
        date_str = f"{parsed_date[0]:04d}-{parsed_date[1]:02d}-{parsed_date[2]:02d}"
        
        desc = line
        desc = re.sub(date_patterns[0][0], "", desc)
        for p, f in date_patterns:
            desc = re.sub(p, "", desc, count=1)
        for amt in amounts:
            desc = desc.replace(amt, "")
        desc = re.sub(r"[₹$£€¥\u20B9]", "", desc)
        desc = re.sub(r"^\s*-\s*", "", desc).strip()
        
        # Often there's a second date in statements (Value Date)
        match2 = re.search(r"^\d{1,2}\s+[A-Za-z]{3}\s+\d{2,4}", desc)
        if match2:
            desc = desc.replace(match2.group(), "").strip()
            
        amount_val = 0.0
        # For statements, usually [Deposit, Withdrawal, Balance] or [Amount, Balance]
        # We'll take the first non-zero amount. Usually it's Withdrawal or Deposit.
        # But wait! If it's a deposit, is it the first amount?
        # Let's take the *first* amount that isn't the balance.
        # Since balances are usually larger, we just take the first match as the transaction amount.
        if amounts:
             amount_val = float(amounts[0].replace(",", ""))
             
        if amount_val == 0.0:
            continue
            
        txn_type = "expense"
        desc_lower = desc.lower()
        if "credit" in desc_lower or "deposit" in desc_lower or "salary" in desc_lower or "interest" in desc_lower or "cr" in desc_lower.split() or "refund" in desc_lower:
            txn_type = "income"
            
        category = _infer_category(desc, "")
        
        results.append({
            "id": str(uuid.uuid4()),
            "date": date_str,
            "amount": amount_val,
            "type": txn_type,
            "scope": "personal",
            "category": category,
            "note": desc[:100].strip()
        })
        
    return results

if __name__ == "__main__":
    pdf_path = r"D:\expense tracker\ebrcpt_file_5e37ba9973e09.pdf"
    text = _extract_text_from_pdf(pdf_path)
    print("Is bank statement:", _is_bank_statement(text))
    if _is_bank_statement(text):
        entries = _extract_bank_statement_from_text(text)
        for e in entries:
            print(f"{e['date']} | {e['type'].upper()} | {e['amount']} | {e['note']}")
        print(f"Total extracted: {len(entries)}")
