from fastapi import APIRouter, Depends, Query, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from typing import List, Optional, Literal
from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime, timezone
import uuid
import io
import csv
import re
import tempfile
import os
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment

from app.auth.firebase import get_current_user, CurrentUser
from app.core.db import db

router = APIRouter(prefix="/api", tags=["entries"])

class Entry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    date: str
    amount: float
    type: Literal["income", "expense"]
    scope: Literal["personal", "business"]
    category: str
    note: Optional[str] = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class EntryCreate(BaseModel):
    date: str
    amount: float
    type: Literal["income", "expense"]
    scope: Literal["personal", "business"]
    category: str
    note: Optional[str] = ""

class EntryUpdate(BaseModel):
    date: Optional[str] = None
    amount: Optional[float] = None
    type: Optional[Literal["income", "expense"]] = None
    scope: Optional[Literal["personal", "business"]] = None
    category: Optional[str] = None
    note: Optional[str] = None

def build_entries_query(user_id: str, year: Optional[int] = None, month: Optional[int] = None, fy_start: Optional[int] = None, scope: Optional[str] = None, type: Optional[str] = None):
    q = {"user_id": user_id}
    if year and month:
        prefix = f"{year:04d}-{month:02d}"
        q["date"] = {"$regex": f"^{prefix}"}
    elif year:
        q["date"] = {"$regex": f"^{year:04d}"}
    elif fy_start:
        q = {"$and": [{"user_id": user_id}, {"$or": [
            {"date": {"$gte": f"{fy_start:04d}-04-01", "$lte": f"{fy_start:04d}-12-31"}},
            {"date": {"$gte": f"{fy_start+1:04d}-01-01", "$lte": f"{fy_start+1:04d}-03-31"}}
        ]}]}
        
    if scope:
        if "$and" in q:
            q["$and"].append({"scope": scope})
        else:
            q["scope"] = scope
    if type:
        if "$and" in q:
            q["$and"].append({"type": type})
        else:
            q["type"] = type
    return q

@router.get("/entries", response_model=List[Entry])
async def list_entries(
    current_user: CurrentUser = Depends(get_current_user),
    year: Optional[int] = None,
    month: Optional[int] = None,
    fy_start: Optional[int] = None,
    scope: Optional[str] = None,
    type: Optional[str] = None,
):
    q = build_entries_query(current_user.firebase_uid, year, month, fy_start, scope, type)
    docs = await db.db.entries.find(q, {"_id": 0}).sort("date", -1).to_list(10000)
    return [Entry(**d) for d in docs]

@router.post("/entries", response_model=Entry)
async def create_entry(body: EntryCreate, current_user: CurrentUser = Depends(get_current_user)):
    entry_dict = body.model_dump()
    entry_dict["user_id"] = current_user.firebase_uid
    entry = Entry(**entry_dict)
    await db.db.entries.insert_one(entry.model_dump())
    return entry

@router.put("/entries/{entry_id}", response_model=Entry)
async def update_entry(entry_id: str, body: EntryUpdate, current_user: CurrentUser = Depends(get_current_user)):
    existing = await db.db.entries.find_one({"id": entry_id, "user_id": current_user.firebase_uid}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Not found")
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if updates:
        await db.db.entries.update_one({"id": entry_id, "user_id": current_user.firebase_uid}, {"$set": updates})
    doc = await db.db.entries.find_one({"id": entry_id, "user_id": current_user.firebase_uid}, {"_id": 0})
    return Entry(**doc)

@router.delete("/entries/{entry_id}")
async def delete_entry(entry_id: str, current_user: CurrentUser = Depends(get_current_user)):
    res = await db.db.entries.delete_one({"id": entry_id, "user_id": current_user.firebase_uid})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"ok": True}

@router.get("/summary/monthly")
async def monthly_summary(year: int = Query(...), month: int = Query(...), current_user: CurrentUser = Depends(get_current_user)):
    q = build_entries_query(current_user.firebase_uid, year=year, month=month)
    docs = await db.db.entries.find(q, {"_id": 0}).to_list(10000)
    result = {
        "personal": {"income": 0.0, "expense": 0.0, "by_category": {}},
        "business": {"income": 0.0, "expense": 0.0, "by_category": {}},
    }
    for d in docs:
        s = result[d["scope"]]
        s[d["type"]] += d["amount"]
        key = d["category"]
        s["by_category"].setdefault(key, {"income": 0.0, "expense": 0.0})
        s["by_category"][key][d["type"]] += d["amount"]
    for scope in ("personal", "business"):
        r = result[scope]
        r["net"] = r["income"] - r["expense"]
    totals = {
        "income": result["personal"]["income"] + result["business"]["income"],
        "expense": result["personal"]["expense"] + result["business"]["expense"],
    }
    totals["net"] = totals["income"] - totals["expense"]
    result["totals"] = totals
    return result

@router.get("/summary/yearly")
async def yearly_summary(fy_start: int = Query(...), current_user: CurrentUser = Depends(get_current_user)):
    q = build_entries_query(current_user.firebase_uid, fy_start=fy_start)
    docs = await db.db.entries.find(q, {"_id": 0}).to_list(100000)
    months = []
    for i in range(12):
        m = ((3 + i) % 12) + 1
        y = fy_start if i < 9 else fy_start + 1
        months.append({"year": y, "month": m, "label": f"{y:04d}-{m:02d}"})

    per_month = {mm["label"]: {
        "personal_income": 0.0, "personal_expense": 0.0,
        "business_income": 0.0, "business_expense": 0.0,
    } for mm in months}

    for d in docs:
        label = d["date"][:7]
        if label not in per_month:
            continue
        key = f"{d['scope']}_{d['type']}"
        per_month[label][key] += d["amount"]

    rows = []
    for mm in months:
        row = {**mm, **per_month[mm["label"]]}
        row["personal_net"] = row["personal_income"] - row["personal_expense"]
        row["business_net"] = row["business_income"] - row["business_expense"]
        row["total_income"] = row["personal_income"] + row["business_income"]
        row["total_expense"] = row["personal_expense"] + row["business_expense"]
        row["total_net"] = row["total_income"] - row["total_expense"]
        rows.append(row)

    totals = {
        "personal_income": sum(r["personal_income"] for r in rows),
        "personal_expense": sum(r["personal_expense"] for r in rows),
        "business_income": sum(r["business_income"] for r in rows),
        "business_expense": sum(r["business_expense"] for r in rows),
    }
    totals["personal_net"] = totals["personal_income"] - totals["personal_expense"]
    totals["business_net"] = totals["business_income"] - totals["business_expense"]
    totals["total_income"] = totals["personal_income"] + totals["business_income"]
    totals["total_expense"] = totals["personal_expense"] + totals["business_expense"]
    totals["total_net"] = totals["total_income"] - totals["total_expense"]

    return {"fy_start": fy_start, "fy_label": f"FY {fy_start}-{str(fy_start+1)[-2:]}", "rows": rows, "totals": totals}

@router.get("/export/csv")
async def export_csv(
    current_user: CurrentUser = Depends(get_current_user),
    fy_start: Optional[int] = None,
    year: Optional[int] = None,
    month: Optional[int] = None,
    scope: Optional[str] = None,
):
    q = build_entries_query(current_user.firebase_uid, year, month, fy_start, scope)
    docs = await db.db.entries.find(q, {"_id": 0}).sort("date", 1).to_list(100000)
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["Date", "Scope", "Type", "Category", "Amount (INR)", "Note"])
    for d in docs:
        w.writerow([d["date"], d["scope"], d["type"], d["category"], f'{d["amount"]:.2f}', d.get("note", "")])
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=finance_export.csv"},
    )

@router.get("/export/xlsx")
async def export_xlsx(
    current_user: CurrentUser = Depends(get_current_user),
    fy_start: Optional[int] = None,
    year: Optional[int] = None,
    month: Optional[int] = None,
    scope: Optional[str] = None,
):
    q = build_entries_query(current_user.firebase_uid, year, month, fy_start, scope)
    docs = await db.db.entries.find(q, {"_id": 0}).sort("date", 1).to_list(100000)
    wb = Workbook()
    ws = wb.active
    ws.title = "Entries"
    headers = ["Date", "Scope", "Type", "Category", "Amount (INR)", "Note"]
    ws.append(headers)
    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill("solid", fgColor="09090B")
    for cell in ws[1]:
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="left")
    for d in docs:
        ws.append([d["date"], d["scope"], d["type"], d["category"], round(d["amount"], 2), d.get("note", "")])
    for col_letter, width in zip(["A", "B", "C", "D", "E", "F"], [14, 12, 12, 28, 16, 40]):
        ws.column_dimensions[col_letter].width = width

    stream = io.BytesIO()
    wb.save(stream)
    stream.seek(0)
    return StreamingResponse(
        stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=finance_export.xlsx"},
    )


# ════════════════════════════════════════════════════════════════════════════════
# Receipt OCR + parsing — fully generic, zero bill-specific hardcodes
# ════════════════════════════════════════════════════════════════════════════════

# Generic receipt keywords used only to score OCR quality. These are domain
# words that appear on virtually any bill (not tied to any specific vendor).
SCORE_KW = [
    "total", "amount", "date", "invoice", "bill", "subtotal",
    "gst", "cgst", "sgst", "qty", "rs", "tax", "price", "store",
    "pharmacy", "thousand", "shop", "receipt", "cash", "paid",
    "net", "due", "discount",
]

# Score below this triggers the fallback engines (rotation scan + pytesseract).
LOW_CONFIDENCE_THRESHOLD = 500


def extract_receipt_data_from_text(text: str) -> dict:
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    text_lower = text.lower()

    # ── 1. Merchant / Note ────────────────────────────────────────────────────
    # Scan lines top-to-bottom, skip boilerplate/label lines, take the first
    # meaningful name-like line. Generic — no vendor-specific names.
    SKIP_STARTS = (
        'bill', 'ship', 'invoice', 'date', 'qty', 'quantity', 'name',
        'time', 'cashier', 'item', 'description', 'amount', 'subtotal',
        'total', 'cash', 'po#', 'due', '#', 'rate', 'terms', 'gstin',
        'routing', 'account', 'state', 'bank', 'payment', 'gst', 'cgst',
        'sgst', 'igst', 'tax', 'sl', 'sr', 'no.', 'mob', 'phone', 'tel',
        'email', 'address', 'city', 'pin', 'table', 'order', 'receipt',
        'thank', 'visit', 'print', 'page', 'regd', 'reg.', 'fssai',
        'store', 'shop', 'download', 'app', 'play', 'google', 'dl no',
        'license', 'licence', 'pan', 'tin', 'cin',
    )
    SKIP_PATTERNS = [
        r'^\d+$',               # pure number
        r'^\d{1,2}[:/]\d{2}',  # time like 21:26
        r'^\W+$',               # only punctuation/symbols
        r'^(www\.|http)',       # URL
        r'^\d{4,}',             # starts with 4+ digits (codes, GSTINs)
        r'^[A-Z0-9]{5,}\d{4,}', # alphanumeric codes
    ]

    note = ''
    for line in lines:
        cleaned = re.sub(r'[^a-zA-Z0-9\s&/\-]', '', line).strip()
        cl = cleaned.lower()
        alpha_chars = sum(1 for c in cleaned if c.isalpha())
        if (
            cleaned
            and len(cleaned) > 3
            and alpha_chars >= 3
            and not cl.startswith(SKIP_STARTS)
            and not any(re.search(p, cleaned) for p in SKIP_PATTERNS)
        ):
            note = cleaned[:80]
            break

    if not note:
        note = 'Imported Receipt'

    # ── 2. Date Extraction ────────────────────────────────────────────────────
    MONTH_MAP = {
        'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
        'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12,
        'january': 1, 'february': 2, 'march': 3, 'april': 4, 'june': 6,
        'july': 7, 'august': 8, 'september': 9, 'october': 10,
        'november': 11, 'december': 12,
        'jan.': 1, 'feb.': 2, 'mar.': 3, 'apr.': 4, 'jun.': 6,
        'jul.': 7, 'aug.': 8, 'sep.': 9, 'oct.': 10, 'nov.': 11, 'dec.': 12,
    }
    DATE_PATTERNS = [
        (r'\b(\d{1,2})[/\-\.](\d{1,2})[/\-\.](\d{4})\b', 'dmy4'),
        (r'\b(\d{4})[/\-\.](\d{1,2})[/\-\.](\d{1,2})\b', 'ymd4'),
        (r'\b(\d{1,2})[/\-\.](\d{1,2})[/\-\.](\d{2})\b',  'dmy2'),
        (r'\b(\d{1,2})[\s\-/\.]+([A-Za-z]{3,9})[\s\-/\.,]+(\d{4})\b', 'dMonY'),
        (r'\b([A-Za-z]{3,9})[\s\-/\.]+(\d{1,2})[,\s]+(\d{4})\b', 'Mdy'),
    ]

    def _try_parse(g, fmt):
        try:
            if fmt == 'dmy4':   d, mo, y = int(g[0]), int(g[1]), int(g[2])
            elif fmt == 'ymd4': y, mo, d = int(g[0]), int(g[1]), int(g[2])
            elif fmt == 'dmy2': d, mo, y = int(g[0]), int(g[1]), 2000 + int(g[2])
            elif fmt == 'dMonY':
                d = int(g[0]); mo = MONTH_MAP.get(g[1].lower().rstrip('.')); y = int(g[2])
                if mo is None: return None
            elif fmt == 'Mdy':
                mo = MONTH_MAP.get(g[0].lower().rstrip('.')); d = int(g[1]); y = int(g[2])
                if mo is None: return None
            else: return None
            if 2000 <= y <= 2100 and 1 <= mo <= 12 and 1 <= d <= 31:
                return (y, mo, d)
        except Exception: pass
        return None

    def _date_from_line(line):
        for pat, fmt in DATE_PATTERNS:
            m = re.search(pat, line, re.IGNORECASE)
            if m:
                r = _try_parse(m.groups(), fmt)
                if r: return r
        return None

    date_str = None
    # Priority 1: invoice/bill date lines — skip "due date" lines
    inv_lines  = [l for l in lines
                  if re.search(r'invoice\s*date|bill\s*date|dt[\.:)]', l, re.IGNORECASE)
                  and not re.search(r'\bdue\b', l, re.IGNORECASE)]
    # Priority 2: any "date" label line (not "due date")
    gen_lines  = [l for l in lines
                  if re.search(r'\bdate\b|dt[\.:)]', l, re.IGNORECASE)
                  and l not in inv_lines
                  and not re.search(r'due\s*date', l, re.IGNORECASE)]
    # Priority 3: all other lines
    rest_lines = [l for l in lines if l not in inv_lines and l not in gen_lines]

    for line in (inv_lines + gen_lines + rest_lines):
        r = _date_from_line(line)
        if r:
            y, mo, d = r
            date_str = f'{y:04d}-{mo:02d}-{d:02d}'
            break

    if not date_str:
        date_str = datetime.now().strftime('%Y-%m-%d')

    # ── 3. Amount Extraction ──────────────────────────────────────────────────
    # Cascade: written words → explicit total label → subtotal+tax → largest
    # decimal on total/cash lines → largest decimal anywhere → integer fallback.
    YEAR_EXCLUDE = {float(y) for y in range(1990, 2101)}

    amount = 0.0

    # Step 0: written-word amounts ("five thousand", "15 thousand" etc.)
    WORD_MAP = {
        'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
        'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
        'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14,
        'fifteen': 15, 'sixteen': 16, 'seventeen': 17, 'eighteen': 18,
        'nineteen': 19, 'twenty': 20, 'thirty': 30, 'forty': 40,
        'fifty': 50, 'sixty': 60, 'seventy': 70, 'eighty': 80, 'ninety': 90,
    }
    _wm = re.search(
        r'\b(' + '|'.join(WORD_MAP) + r'|\d+)\s+thousand(?:\s+(?:and\s+)?(\d+))?',
        text_lower
    )
    if _wm:
        try:
            base = WORD_MAP.get(_wm.group(1)) or float(_wm.group(1))
            remainder = float(_wm.group(2)) if _wm.group(2) else 0
            amount = base * 1000 + remainder
        except Exception: pass

    # Also: plain digit + "thousand" / ",000"
    if amount == 0.0:
        _th = re.search(r'\b(\d[\d,]*)\s*(?:thousand)\b', text_lower)
        if _th:
            try: amount = float(_th.group(1).replace(',', '')) * 1000
            except Exception: pass

    if amount == 0.0:
        # Step 1: explicit INVOICE TOTAL / GRAND TOTAL / BALANCE DUE label
        for i, line in enumerate(lines):
            if re.search(
                r'invoice\s*total|grand\s*total|net\s*total|net\s*amount|'
                r'total\s*amount|payable\s*amount|amount\s*payable|balance\s*due',
                line, re.IGNORECASE
            ):
                block = ' '.join(lines[i:i+3])
                candidates = []
                for n in re.findall(r'[\d,]+\.\d{2}', block):
                    try:
                        v = float(n.replace(',', ''))
                        if 1.0 <= v <= 500000.0 and v not in YEAR_EXCLUDE:
                            candidates.append(v)
                    except ValueError: pass
                if candidates:
                    amount = max(candidates)
                    break

    if amount == 0.0:
        # Step 2: subtotal + GST/tax + round-off
        subtotal = 0.0; tax_amount = 0.0; round_off = 0.0
        for i, line in enumerate(lines):
            if re.search(r'\bsub\s*-?\s*total\b', line, re.IGNORECASE) and subtotal == 0.0:
                block = ' '.join(lines[i:i+8])
                m = re.search(r'([\d,]+\.\d{2})', block)
                if m:
                    try: subtotal = float(m.group(1).replace(',', ''))
                    except ValueError: pass
        for i, line in enumerate(lines):
            if re.search(r'\b(gst|cgst|sgst|igst|vat|tax)\b', line, re.IGNORECASE) \
               and not re.search(r'\bsub\b', line, re.IGNORECASE):
                block = ' '.join(lines[i:i+8])
                for n in re.findall(r'([\d,]+\.\d{2})', block):
                    try:
                        v = float(n.replace(',', ''))
                        if v not in {2.5, 5.0, 9.0, 12.0, 18.0, 28.0} and v != subtotal:
                            tax_amount += v; break
                    except ValueError: pass
        for i, line in enumerate(lines):
            if re.search(r'\bround\b', line, re.IGNORECASE):
                block = ' '.join(lines[i:i+4])
                m = re.search(r'([+-]?[\d,]+\.\d{2}|[+-]?\d+)', block)
                if m:
                    try:
                        v = float(m.group(1))
                        if abs(v) < 10: round_off = v
                    except ValueError: pass
        if subtotal > 0:
            amount = round(subtotal + tax_amount + round_off, 2)

    if amount == 0.0:
        # Step 3: largest decimal on any total/cash/paid/net/payable line
        for line in lines:
            if re.search(r'\btotal\b|\bcash\b|\bpaid\b|\bnet\b|\bpayable\b', line, re.IGNORECASE):
                for n in re.findall(r'[\d,]+\.\d{2}', line):
                    try:
                        v = float(n.replace(',', ''))
                        if 1.0 <= v <= 500000.0 and v not in YEAR_EXCLUDE and v > amount:
                            amount = v
                    except ValueError: pass

    if amount == 0.0:
        # Step 4: largest decimal anywhere in text (ignoring percentage rows)
        for line in lines:
            for n in re.findall(r'[\d,]+\.\d{2}', line):
                try:
                    v = float(n.replace(',', ''))
                    if 1.0 <= v <= 500000.0 and v not in YEAR_EXCLUDE and v > amount:
                        amount = v
                except ValueError: pass

    if amount == 0.0:
        # Step 5: integer amounts written without decimals (e.g. "1200", "15000")
        for line in lines:
            for n in re.findall(r'\b(\d{3,6})\b', line):
                try:
                    v = float(n)
                    if 1.0 <= v <= 500000.0 and v not in YEAR_EXCLUDE and v > amount:
                        amount = v
                except ValueError: pass

    return {
        'note': note,
        'date': date_str,
        'amount': amount,
        'type': 'expense',
        'scope': 'personal',
        'category': 'Other',
    }


# ── OCR helpers ────────────────────────────────────────────────────────────────

def _load_candidate_images(tmp_path: str, suffix: str, tmp_clean_files: list) -> list:
    """Load images from a PDF (ALL pages, embedded + rasterised at 300 DPI) or a
    single image file. EXIF rotation is applied first so downstream stages always
    see upright images."""
    from PIL import Image, ImageOps

    candidate_imgs = []
    ext = suffix.lower()

    if ext == ".pdf":
        try:
            import fitz
            doc = fitz.open(tmp_path)
            for page_idx in range(len(doc)):
                page = doc[page_idx]
                embedded = page.get_images(full=True)
                if embedded:
                    for img_ref in embedded:
                        try:
                            base_image = doc.extract_image(img_ref[0])
                            tmp_img = tempfile.NamedTemporaryFile(delete=False, suffix=".jpg")
                            tmp_img.write(base_image["image"])
                            tmp_img.close()
                            tmp_clean_files.append(tmp_img.name)
                            img = Image.open(tmp_img.name)
                            try:
                                img = ImageOps.exif_transpose(img)
                            except Exception:
                                pass
                            candidate_imgs.append(img)
                        except Exception:
                            pass
                pix = page.get_pixmap(dpi=300)
                tmp_pg = tempfile.NamedTemporaryFile(delete=False, suffix=".png")
                pix.save(tmp_pg.name)
                tmp_clean_files.append(tmp_pg.name)
                candidate_imgs.append(Image.open(tmp_pg.name))
        except Exception:
            pass
    elif ext in [".png", ".jpg", ".jpeg", ".bmp", ".webp"]:
        try:
            img = Image.open(tmp_path)
            # EXIF correction first — fixes phone photos saved sideways
            try:
                img = ImageOps.exif_transpose(img)
            except Exception:
                pass
            candidate_imgs.append(img)
        except Exception:
            pass

    return candidate_imgs


def _auto_deskew(pil_img) -> "Image.Image":
    """Auto-deskew a tilted scan using OpenCV minAreaRect angle detection."""
    try:
        import cv2
        import numpy as np
        arr = np.array(pil_img.convert("L"), dtype=np.uint8)
        _, thresh = cv2.threshold(arr, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        coords = cv2.findNonZero(thresh)
        if coords is None:
            return pil_img
        angle = cv2.minAreaRect(coords)[-1]
        if angle < -45:
            angle = -(90 + angle)
        else:
            angle = -angle
        if abs(angle) < 0.5:
            return pil_img
        h, w = arr.shape[:2]
        center = (w // 2, h // 2)
        m = cv2.getRotationMatrix2D(center, angle, 1.0)
        rotated = cv2.warpAffine(arr, m, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
        return Image.fromarray(rotated)
    except Exception:
        return pil_img


def _preprocess_image(pil_img) -> list:
    """Return multiple preprocessed variants of an image for OCR.

    Pipeline (applied to every candidate image):
      1. Auto-deskew
      2. Upscale to a minimum 1200px on the long edge (~300 DPI equivalent)
      3. Grayscale, contrast boost, CLAHE + Otsu binarization, colour isolation
    """
    from PIL import Image, ImageEnhance
    import numpy as np

    results = []
    try:
        gray = pil_img.convert("L")
        w, h = gray.size

        # Upscale small images BEFORE any downstream variant is produced so
        # every path benefits from the resolution bump.
        if max(w, h) < 1200:
            scale = 1200 / max(w, h)
            gray = gray.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)

        # Auto-deskew fixes tilted scans
        gray = _auto_deskew(gray)

        # Variant 1: plain grayscale (good for clean laser prints)
        results.append(gray)

        # Variant 2: contrast-boosted (helps faded thermal receipts)
        try:
            results.append(ImageEnhance.Contrast(gray).enhance(2.0))
        except Exception:
            pass

        # Variant 3: OpenCV CLAHE + Otsu binarization (best for low-contrast scans)
        try:
            import cv2
            arr = np.array(gray, dtype=np.uint8)
            clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
            arr_c = clahe.apply(arr)
            _, arr_b = cv2.threshold(arr_c, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            arr_d = cv2.fastNlMeansDenoising(arr_b, h=10)
            results.append(Image.fromarray(arr_d))
        except ImportError:
            pass   # opencv not installed — skip
        except Exception:
            pass

        # Variant 4: colour channel isolation (strips blue stamp ink)
        try:
            if pil_img.mode in ("RGB", "RGBA"):
                arr_c = np.array(pil_img.convert("RGB")).astype(np.float32)
                r_c, g_c, b_c = arr_c[:,:,0], arr_c[:,:,1], arr_c[:,:,2]
                iso = np.clip(255 - (b_c - r_c) * 2, 0, 255).astype(np.uint8)
                results.append(Image.fromarray(iso))
        except Exception:
            pass

    except Exception:
        pass

    return results or [pil_img.convert("L")]


def _score_ocr_text(text: str) -> int:
    """Score OCR output: prefer longer text with more receipt keywords."""
    l_txt = text.lower()
    kw_hits = sum(1 for k in SCORE_KW if k in l_txt)
    return len(text.strip()) + (kw_hits * 300)


def _ocr_liteparse(path: str, parser) -> str:
    """Run the LiteParse engine on an image path and return its text."""
    try:
        res = parser.parse(path)
        return getattr(res, "markdown", "") or getattr(res, "text", "") or str(res)
    except Exception:
        return ""


def _ocr_tesseract(pil_img) -> str:
    """Run pytesseract as a second OCR engine (fallback)."""
    try:
        import pytesseract
        return pytesseract.image_to_string(pil_img)
    except Exception:
        return ""


def _merge_ocr_texts(*texts) -> str:
    """Merge OCR output from multiple engines, de-duplicating identical lines."""
    seen = set()
    merged = []
    for t in texts:
        if not t:
            continue
        for line in t.split("\n"):
            s = line.strip()
            if not s:
                continue
            key = s.lower()
            if key not in seen:
                seen.add(key)
                merged.append(s)
    return "\n".join(merged)


def _ocr_receipt(tmp_path: str, suffix: str, tmp_clean_files: list) -> str:
    """Full OCR pipeline.

    Order:
      1. Load every candidate image (all PDF pages), EXIF-corrected first.
      2. Preprocess (deskew, 300 DPI upscale, CLAHE, Otsu) and OCR with LiteParse.
      3. If confidence is low (< 500 chars), try a 4-angle rotation scan.
      4. If still low, run pytesseract and merge its output.
    """
    from liteparse import LiteParse

    candidate_imgs = _load_candidate_images(tmp_path, suffix, tmp_clean_files)
    if not candidate_imgs:
        return ""

    parser = LiteParse(output_format="markdown")
    best_text = ""
    best_score = -1

    def _save_tmp(img) -> str:
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".jpg")
        img.save(tmp.name)
        tmp.close()
        tmp_clean_files.append(tmp.name)
        return tmp.name

    # Stage 1: EXIF-corrected, preprocessed images (no rotation)
    for img in candidate_imgs:
        for variant in _preprocess_image(img):
            text = _ocr_liteparse(_save_tmp(variant), parser)
            s = _score_ocr_text(text)
            if s > best_score:
                best_score, best_text = s, text

    # Stage 2: low confidence → 4-angle rotation scan
    if best_score < LOW_CONFIDENCE_THRESHOLD:
        for img in candidate_imgs:
            for rot in (90, 180, 270):
                r_img = img.rotate(rot, expand=True)
                for variant in _preprocess_image(r_img):
                    text = _ocr_liteparse(_save_tmp(variant), parser)
                    s = _score_ocr_text(text)
                    if s > best_score:
                        best_score, best_text = s, text

    # Stage 3: pytesseract fallback + merge when LiteParse still looks weak
    if best_score < LOW_CONFIDENCE_THRESHOLD:
        for img in candidate_imgs:
            t = _ocr_tesseract(img)
            if t and t.strip():
                merged = _merge_ocr_texts(best_text, t)
                s = _score_ocr_text(merged)
                if s > best_score:
                    best_score, best_text = s, merged

    return best_text


@router.post("/entries/import")
async def import_receipt(
    file: UploadFile = File(...),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Upload a receipt image/PDF, OCR it, and auto-save it as an expense entry."""
    tmp_path = None
    tmp_clean_files = []

    try:
        suffix = os.path.splitext(file.filename or "")[1].lower() or ".jpg"
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Empty file")

        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
        tmp.write(content)
        tmp.close()
        tmp_path = tmp.name
        tmp_clean_files.append(tmp_path)

        text = _ocr_receipt(tmp_path, suffix, tmp_clean_files)
        if not text.strip():
            raise HTTPException(status_code=422, detail="Could not read any text from the file")

        parsed = extract_receipt_data_from_text(text)

        entry_dict = {
            "user_id": current_user.firebase_uid,
            "date": parsed["date"],
            "amount": parsed["amount"],
            "type": parsed.get("type", "expense"),
            "scope": parsed.get("scope", "personal"),
            "category": parsed.get("category", "Other"),
            "note": parsed.get("note", ""),
        }

        dup_filter = {
            "user_id": current_user.firebase_uid,
            "date": entry_dict["date"],
            "amount": entry_dict["amount"],
            "note": entry_dict["note"],
        }
        existing = await db.db.entries.find_one(dup_filter)
        if existing:
            existing["id"] = existing.get("id", str(existing.get("_id", "")))
            existing.pop("_id", None)
            return Entry(**existing)

        entry = Entry(**entry_dict)
        await db.db.entries.insert_one(entry.model_dump())
        return entry
    except HTTPException:
        raise
    except Exception as e:
        print(f"Import error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        for p in tmp_clean_files:
            if os.path.exists(p):
                try:
                    os.remove(p)
                except Exception:
                    pass
