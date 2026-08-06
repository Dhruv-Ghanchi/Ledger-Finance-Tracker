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
import pandas as pd
import numpy as np

from app.auth.firebase import get_current_user, CurrentUser
from app.subscriptions.checker import require_premium
from app.core.db import db

router = APIRouter(prefix="/api", tags=["entries"])

# ── Models ─────────────────────────────────────────────────────────────────────

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

class BulkConfirmRequest(BaseModel):
    entries: List[Entry]
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

# ── Query builder ──────────────────────────────────────────────────────────────

def build_entries_query(
    user_id: str,
    year: Optional[int] = None,
    month: Optional[int] = None,
    fy_start: Optional[int] = None,
    scope: Optional[str] = None,
    type: Optional[str] = None,
):
    q = {"user_id": user_id}
    if year and month:
        q["date"] = {"$regex": f"^{year:04d}-{month:02d}"}
    elif year:
        q["date"] = {"$regex": f"^{year:04d}"}
    elif fy_start:
        q = {"$and": [{"user_id": user_id}, {"$or": [
            {"date": {"$gte": f"{fy_start:04d}-04-01", "$lte": f"{fy_start:04d}-12-31"}},
            {"date": {"$gte": f"{fy_start+1:04d}-01-01", "$lte": f"{fy_start+1:04d}-03-31"}},
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

# ── CRUD routes ────────────────────────────────────────────────────────────────

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
async def update_entry(
    entry_id: str,
    body: EntryUpdate,
    current_user: CurrentUser = Depends(get_current_user),
):
    existing = await db.db.entries.find_one(
        {"id": entry_id, "user_id": current_user.firebase_uid}, {"_id": 0}
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Not found")
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if updates:
        await db.db.entries.update_one(
            {"id": entry_id, "user_id": current_user.firebase_uid}, {"$set": updates}
        )
    doc = await db.db.entries.find_one(
        {"id": entry_id, "user_id": current_user.firebase_uid}, {"_id": 0}
    )
    return Entry(**doc)

@router.delete("/entries/{entry_id}")
async def delete_entry(entry_id: str, current_user: CurrentUser = Depends(get_current_user)):
    res = await db.db.entries.delete_one({"id": entry_id, "user_id": current_user.firebase_uid})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"ok": True}

# ── Summary routes ─────────────────────────────────────────────────────────────

@router.get("/summary/monthly")
async def monthly_summary(
    year: int = Query(...),
    month: int = Query(...),
    current_user: CurrentUser = Depends(get_current_user),
):
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
    for scope_key in ("personal", "business"):
        r = result[scope_key]
        r["net"] = r["income"] - r["expense"]
    totals = {
        "income": result["personal"]["income"] + result["business"]["income"],
        "expense": result["personal"]["expense"] + result["business"]["expense"],
    }
    totals["net"] = totals["income"] - totals["expense"]
    result["totals"] = totals
    return result

@router.get("/summary/yearly")
async def yearly_summary(
    fy_start: int = Query(...),
    current_user: CurrentUser = Depends(get_current_user),
):
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

    return {
        "fy_start": fy_start,
        "fy_label": f"FY {fy_start}-{str(fy_start+1)[-2:]}",
        "rows": rows,
        "totals": totals,
    }

# ── Export routes ──────────────────────────────────────────────────────────────

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
# Receipt OCR + parsing
# ════════════════════════════════════════════════════════════════════════════════

# ── Module-level constants ─────────────────────────────────────────────────────

# Receipt keywords used only to score OCR quality.
_SCORE_KW = [
    "total", "amount", "date", "invoice", "bill", "subtotal",
    "gst", "cgst", "sgst", "qty", "rs", "tax", "price",
    "receipt", "cash", "paid", "net", "due", "discount",
]

# OCR score below this triggers rotation scan + pytesseract fallback.
_LOW_CONFIDENCE = 500

# Lines that start with these tokens are boilerplate — not merchant names.
_SKIP_STARTS = (
    "bill", "ship", "invoice", "date", "qty", "quantity", "name",
    "time", "cashier", "item", "description", "amount", "subtotal",
    "total", "cash", "po#", "due", "#", "rate", "terms", "gstin",
    "routing", "account", "state", "bank", "payment", "gst", "cgst",
    "sgst", "igst", "tax", "sl", "sr", "no.", "mob", "phone", "tel",
    "email", "address", "city", "pin", "table", "order", "receipt",
    "thank", "visit", "print", "page", "regd", "reg.", "fssai",
    "store", "shop", "download", "app", "play", "google", "dl no",
    "license", "licence", "pan", "tin", "cin",
)

_SKIP_PATTERNS = [
    r"^\d+$",               # pure number
    r"^\d{1,2}[:/]\d{2}",  # time like 21:26
    r"^\W+$",               # only punctuation/symbols
    r"^(www\.|http)",       # URL
    r"^\d{4,}",             # starts with 4+ digits (codes, GSTINs)
    r"^[A-Z0-9]{5,}\d{4,}", # alphanumeric codes
]

_MONTH_MAP = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
    "january": 1, "february": 2, "march": 3, "april": 4, "june": 6,
    "july": 7, "august": 8, "september": 9, "october": 10,
    "november": 11, "december": 12,
    "jan.": 1, "feb.": 2, "mar.": 3, "apr.": 4, "jun.": 6,
    "jul.": 7, "aug.": 8, "sep.": 9, "oct.": 10, "nov.": 11, "dec.": 12,
}

# (regex, format_name) — tried in order, first valid date wins.
_DATE_PATTERNS = [
    (r"\b(\d{1,2})[/\-\.](\d{1,2})[/\-\.](\d{4})\b", "dmy4"),
    (r"\b(\d{4})[/\-\.](\d{1,2})[/\-\.](\d{1,2})\b", "ymd4"),
    (r"\b(\d{1,2})[/\-\.](\d{1,2})[/\-\.](\d{2})\b",  "dmy2"),
    (r"\b(\d{1,2})[\s\-/\.]+([A-Za-z]{3,9})[\s\-/\.,]+(\d{4})\b", "dMonY"),
    (r"\b([A-Za-z]{3,9})[\s\-/\.]+(\d{1,2})[,\s]+(\d{4})\b", "Mdy"),
    # Compact run-on 8-digit dates: DDMMYYYY or YYYYMMDD
    (r"\b(\d{2})(\d{2})(\d{4})\b", "dmy4"),
    (r"\b(\d{4})(\d{2})(\d{2})\b", "ymd4"),
]

_YEAR_EXCLUDE = frozenset(float(y) for y in range(1990, 2101))

_WORD_TO_NUM = {
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
    "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
    "eleven": 11, "twelve": 12, "thirteen": 13, "fourteen": 14,
    "fifteen": 15, "sixteen": 16, "seventeen": 17, "eighteen": 18,
    "nineteen": 19, "twenty": 20, "thirty": 30, "forty": 40,
    "fifty": 50, "sixty": 60, "seventy": 70, "eighty": 80, "ninety": 90,
}

# Generic keyword → category map (no vendor-specific names).
_CATEGORY_KEYWORDS: list[tuple[str, str]] = [
    (r"restaurant|cafe|coffee|tea|food|dining|meal|bakery|dhaba|"
     r"sweets|juice|pizza|burger|biryani|thali|snack|tiffin|canteen",
     "Food & Dining"),
    (r"grocery|supermarket|kirana|mart|general\s+store|provision|"
     r"vegetable|fruit|dairy|milk|bread|rice|flour|oil|masala",
     "Groceries"),
    (r"pharmacy|medical|medicine|hospital|clinic|doctor|lab|diagnostic|"
     r"chemist|drug|surgical|health|wellness|optical|dental|ayush",
     "Healthcare"),
    (r"petrol|fuel|diesel|auto|cab|taxi|uber|ola|bus|train|metro|toll|"
     r"parking|tyre|service\s+center|garage|transport|travel|commute",
     "Transport"),
    (r"electricity|water|gas|broadband|internet|wifi|mobile|recharge|"
     r"dth|cable|telecom|utility|maintenance",
     "Utilities"),
    (r"cloth|apparel|garment|fashion|shoes|footwear|textile|boutique|"
     r"mall|showroom|retail|amazon|flipkart|myntra",
     "Shopping"),
    (r"school|college|university|tuition|coaching|course|book|stationery|"
     r"library|education|institute|academy|fees",
     "Education"),
    (r"cinema|theatre|theater|movie|film|game|entertainment|event|concert|"
     r"club|recreation|sport|gym|fitness",
     "Entertainment"),
]

# ── Helpers ────────────────────────────────────────────────────────────────────

def _make_tmp_path(suffix: str) -> str:
    """Return a unique temp-file path WITHOUT opening it.

    NamedTemporaryFile on Windows holds an exclusive open handle that blocks
    PyMuPDF and PIL from writing to the same path.  A plain uuid-based path
    avoids this entirely.
    """
    return os.path.join(tempfile.gettempdir(), f"lp_{uuid.uuid4().hex}{suffix}")


def _clean_ocr_text(text: str) -> str:
    """Strip markdown fences and other LiteParse formatting artifacts before
    the text is passed to the field extractors."""
    # Remove fenced code blocks entirely (keep inner text)
    text = re.sub(r"```[^\n]*\n(.*?)```", r"\1", text, flags=re.DOTALL)
    # Remove stray ``` markers
    text = re.sub(r"```[^\n]*", "", text)
    # Remove markdown heading markers (keep the text)
    text = re.sub(r"^#{1,6}\s+", "", text, flags=re.MULTILINE)
    # Remove table separator lines (|---|---|)
    text = re.sub(r"^\s*\|?[\s\-|]+\|?\s*$", "", text, flags=re.MULTILINE)
    # Normalize currency symbols adjacent to digits → plain digit (₹1,200 → 1,200)
    text = re.sub(r"[₹$£€¥\u20B9]\s*", "", text)
    # Collapse multiple blank lines
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _infer_category(note: str, raw_text: str) -> str:
    """Return the best-matching category from _CATEGORY_KEYWORDS.
    Falls back to 'Other'. Pure regex — no API calls."""
    haystack = (note + " " + raw_text[:600]).lower()
    for pattern, category in _CATEGORY_KEYWORDS:
        if re.search(pattern, haystack, re.IGNORECASE):
            return category
    return "Other"


def _try_parse_date(groups, fmt: str):
    """Parse a regex match group tuple into (year, month, day) or None."""
    try:
        if fmt == "dmy4":
            d, mo, y = int(groups[0]), int(groups[1]), int(groups[2])
        elif fmt == "ymd4":
            y, mo, d = int(groups[0]), int(groups[1]), int(groups[2])
        elif fmt == "dmy2":
            d, mo, y = int(groups[0]), int(groups[1]), 2000 + int(groups[2])
        elif fmt == "dMonY":
            d = int(groups[0])
            mo = _MONTH_MAP.get(groups[1].lower().rstrip("."))
            y = int(groups[2])
            if mo is None:
                return None
        elif fmt == "Mdy":
            mo = _MONTH_MAP.get(groups[0].lower().rstrip("."))
            d = int(groups[1])
            y = int(groups[2])
            if mo is None:
                return None
        else:
            return None
        if y < 100:
            y += 2000
        if 2000 <= y <= 2100 and 1 <= mo <= 12 and 1 <= d <= 31:
            return (y, mo, d)
    except Exception:
        pass
    return None


def _date_from_line(line: str):
    """Try every date pattern on a single line; return (y, m, d) or None."""
    for pat, fmt in _DATE_PATTERNS:
        m = re.search(pat, line, re.IGNORECASE)
        if m:
            result = _try_parse_date(m.groups(), fmt)
            if result:
                return result
    return None


# ── Main parser ────────────────────────────────────────────────────────────────

def extract_receipt_data_from_text(text: str) -> dict:
    """Extract note, date, amount, type, scope, category from raw OCR text."""
    text = _clean_ocr_text(text)
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    text_lower = text.lower()

    # ── 1. Merchant / Note ────────────────────────────────────────────────────
    note = ""
    for line in lines:
        cleaned = re.sub(r"[^a-zA-Z0-9\s&/\-]", "", line).strip()
        cl = cleaned.lower()
        alpha_chars = sum(1 for c in cleaned if c.isalpha())
        # Require at least one word with 4+ consecutive letters (filters garbled OCR)
        has_real_word = bool(re.search(r"[a-zA-Z]{4,}", cleaned))
        if (
            cleaned
            and len(cleaned) > 3
            and alpha_chars >= 3
            and has_real_word
            and not cl.startswith(_SKIP_STARTS)
            and not any(re.search(p, cleaned) for p in _SKIP_PATTERNS)
        ):
            note = cleaned[:80]
            break
    if not note:
        note = "Imported Receipt"

    # ── 2. Date ───────────────────────────────────────────────────────────────
    # Priority 1 → invoice/bill date lines (not "due date")
    inv_lines = [l for l in lines
                 if re.search(r"invoice\s*date|bill\s*date|dt[\.:)]", l, re.IGNORECASE)
                 and not re.search(r"\bdue\b", l, re.IGNORECASE)]
    # Priority 2 → any generic "date" line (not "due date")
    gen_lines = [l for l in lines
                 if re.search(r"\bdate\b|dt[\.:)]", l, re.IGNORECASE)
                 and l not in inv_lines
                 and not re.search(r"due\s*date", l, re.IGNORECASE)]
    # Priority 3 → everything else
    rest_lines = [l for l in lines if l not in inv_lines and l not in gen_lines]

    date_str = None
    for line in inv_lines + gen_lines + rest_lines:
        result = _date_from_line(line)
        if result:
            y, mo, d = result
            date_str = f"{y:04d}-{mo:02d}-{d:02d}"
            break
    if not date_str:
        date_str = datetime.now().strftime("%Y-%m-%d")

    # ── 3. Amount ─────────────────────────────────────────────────────────────
    # Cascade: word amounts → explicit total label → subtotal+tax →
    # total-line decimal → any decimal → integer fallback.
    # Lines that contain "%" are always skipped to avoid grabbing GST rates.

    amount = 0.0

    # Step 0 — written-word thousands ("five thousand", "15 thousand 500")
    _wm = re.search(
        r"\b(" + "|".join(_WORD_TO_NUM) + r"|\d+)\s+thousand(?:\s+(?:and\s+)?(\d+))?",
        text_lower,
    )
    if _wm:
        try:
            base = _WORD_TO_NUM.get(_wm.group(1)) or float(_wm.group(1))
            remainder = float(_wm.group(2)) if _wm.group(2) else 0
            amount = base * 1000 + remainder
        except Exception:
            pass

    if amount == 0.0:
        _th = re.search(r"\b(\d[\d,]*)\s*thousand\b", text_lower)
        if _th:
            try:
                amount = float(_th.group(1).replace(",", "")) * 1000
            except Exception:
                pass

    if amount == 0.0:
        # Step 1 — explicit grand/invoice/payable total label
        # Searches a 5-line window (covers large invoices where amount is on next line).
        _TOTAL_LABELS = re.compile(
            r"invoice\s*total|grand\s*total|g\.?\s*total|net\s*total|net\s*amount|"
            r"total\s*amount|payable\s*amount|amount\s*payable|balance\s*due|"
            r"bill\s*total|total\s*due|total\s*payable",
            re.IGNORECASE,
        )
        for i, line in enumerate(lines):
            if _TOTAL_LABELS.search(line):
                block = " ".join(lines[i:i + 5])
                candidates = []
                for n in re.findall(r"[\d,]+\.\d{2}", block):
                    try:
                        v = float(n.replace(",", ""))
                        if 1.0 <= v <= 500000.0 and v not in _YEAR_EXCLUDE:
                            candidates.append(v)
                    except ValueError:
                        pass
                if candidates:
                    amount = max(candidates)
                    break

    if amount == 0.0:
        # Step 2 — subtotal + GST + round-off
        # Only used when no explicit total label was found.
        subtotal = tax_amount = round_off = 0.0
        for i, line in enumerate(lines):
            if re.search(r"\bsub\s*-?\s*total\b", line, re.IGNORECASE) and subtotal == 0.0:
                block = " ".join(lines[i:i + 8])
                m = re.search(r"([\d,]+\.\d{2})", block)
                if m:
                    try:
                        subtotal = float(m.group(1).replace(",", ""))
                    except ValueError:
                        pass
        for i, line in enumerate(lines):
            if re.search(r"\b(gst|cgst|sgst|igst|vat|tax)\b", line, re.IGNORECASE) \
               and not re.search(r"\bsub\b", line, re.IGNORECASE):
                block = " ".join(lines[i:i + 8])
                for n in re.findall(r"([\d,]+\.\d{2})", block):
                    try:
                        v = float(n.replace(",", ""))
                        if v not in {2.5, 5.0, 9.0, 12.0, 18.0, 28.0} and v != subtotal:
                            tax_amount += v
                            break
                    except ValueError:
                        pass
        for i, line in enumerate(lines):
            if re.search(r"\bround\b", line, re.IGNORECASE):
                block = " ".join(lines[i:i + 4])
                m = re.search(r"([+-]?[\d,]+\.\d{2}|[+-]?\d+)", block)
                if m:
                    try:
                        v = float(m.group(1))
                        if abs(v) < 10:
                            round_off = v
                    except ValueError:
                        pass
        if subtotal > 0:
            amount = round(subtotal + tax_amount + round_off, 2)

    if amount == 0.0:
        # Step 3 — largest decimal on total/cash/paid/net/payable/g.total lines
        _TOTAL_LINE = re.compile(
            r"\btotal\b|\bcash\b|\bpaid\b|\bnet\b|\bpayable\b|g\.?\s*total",
            re.IGNORECASE,
        )
        for line in lines:
            if "%" in line:
                continue
            if _TOTAL_LINE.search(line):
                for n in re.findall(r"[\d,]+\.\d{2}", line):
                    try:
                        v = float(n.replace(",", ""))
                        if 1.0 <= v <= 500000.0 and v not in _YEAR_EXCLUDE and v > amount:
                            amount = v
                    except ValueError:
                        pass

    if amount == 0.0:
        # Step 4 — fallback: use the last decimal found in the receipt.
        # Often the last number is the final total (after discounts, which make the subtotal larger).
        # We skip percentage lines and lines that look like phone/licence numbers.
        _PHONE_LINE = re.compile(
            r"\b(mob|phone|tel|gstin|dl\.?\s*no|licence|lic\.?\s*no|account|acct|routing)\b",
            re.IGNORECASE,
        )
        candidates = []
        for line in lines:
            if "%" in line:
                continue
            if _PHONE_LINE.search(line):
                continue
            for n in re.findall(r"[\d,]+\.\d{2}", line):
                try:
                    v = float(n.replace(",", ""))
                    if 1.0 <= v <= 500000.0 and v not in _YEAR_EXCLUDE:
                        candidates.append(v)
                except ValueError:
                    pass
        if candidates:
            # We pick the last candidate as it's most likely the final total at the bottom
            amount = candidates[-1]

    if amount == 0.0:
        # Step 5 — integer amounts with no decimal (e.g. "1200", "15000")
        # Skip lines with phone/licence/GSTIN keywords to avoid false positives.
        _PHONE_LINE = re.compile(
            r"\b(mob|phone|tel|gstin|dl\.?\s*no|licence|lic\.?\s*no|account|acct|routing|pin)\b",
            re.IGNORECASE,
        )
        for line in lines:
            if "%" in line:
                continue
            if _PHONE_LINE.search(line):
                continue
            for n in re.findall(r"\b(\d{3,6})\b", line):
                try:
                    v = float(n)
                    if 1.0 <= v <= 500000.0 and v not in _YEAR_EXCLUDE and v > amount:
                        amount = v
                except ValueError:
                    pass

    category = _infer_category(note, text)

    return {
        "note": note,
        "date": date_str,
        "amount": amount,
        "type": "expense",
        "scope": "personal",
        "category": category,
    }


# ── OCR pipeline ───────────────────────────────────────────────────────────────

def _load_candidate_images(tmp_path: str, suffix: str, tmp_clean_files: list) -> list:
    """Load images from a PDF (all pages: embedded + rasterised at 300 DPI) or
    a single image file. EXIF rotation is applied so downstream stages always
    see upright images.

    Uses _make_tmp_path() (a plain path string, never an open handle) to avoid
    the Windows NamedTemporaryFile exclusive-lock problem.
    """
    from PIL import Image, ImageOps

    candidate_imgs = []
    ext = suffix.lower()

    if ext == ".pdf":
        try:
            import fitz
            doc = fitz.open(tmp_path)
            for page_idx in range(len(doc)):
                page = doc[page_idx]
                # Embedded images (e.g. JPEG stored inside the PDF)
                for img_ref in page.get_images(full=True):
                    try:
                        base_image = doc.extract_image(img_ref[0])
                        path = _make_tmp_path(".jpg")
                        with open(path, "wb") as f:
                            f.write(base_image["image"])
                        tmp_clean_files.append(path)
                        img = Image.open(path)
                        try:
                            img = ImageOps.exif_transpose(img)
                        except Exception:
                            pass
                        candidate_imgs.append(img)
                    except Exception:
                        pass
                # Full-page raster at 300 DPI (catches text/vector PDFs too)
                pix = page.get_pixmap(dpi=300)
                path = _make_tmp_path(".png")
                pix.save(path)          # file not open → no Windows lock
                tmp_clean_files.append(path)
                candidate_imgs.append(Image.open(path))
            doc.close()
        except Exception:
            pass

    elif ext in [".png", ".jpg", ".jpeg", ".bmp", ".webp"]:
        try:
            img = Image.open(tmp_path)
            try:
                img = ImageOps.exif_transpose(img)
            except Exception:
                pass
            candidate_imgs.append(img)
        except Exception:
            pass

    return candidate_imgs


def _auto_deskew(pil_img) -> "Image.Image":
    """Auto-deskew a tilted scan using OpenCV minAreaRect."""
    try:
        import cv2
        import numpy as np
        arr = np.array(pil_img.convert("L"), dtype=np.uint8)
        _, thresh = cv2.threshold(arr, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        coords = cv2.findNonZero(thresh)
        if coords is None:
            return pil_img
        angle = cv2.minAreaRect(coords)[-1]
        angle = -(90 + angle) if angle < -45 else -angle
        if abs(angle) < 0.5:
            return pil_img
        h, w = arr.shape[:2]
        M = cv2.getRotationMatrix2D((w // 2, h // 2), angle, 1.0)
        rotated = cv2.warpAffine(arr, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
        return Image.fromarray(rotated)
    except Exception:
        return pil_img


def _preprocess_image(pil_img) -> list:
    """Return up to 4 preprocessed variants of an image for OCR:
    grayscale, contrast-boosted, CLAHE+Otsu binary, colour-channel isolation."""
    from PIL import Image, ImageEnhance
    import numpy as np

    results = []
    try:
        gray = pil_img.convert("L")
        w, h = gray.size
        # Upscale small images to at least 1200px on the long edge
        if max(w, h) < 1200:
            scale = 1200 / max(w, h)
            gray = gray.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)
        gray = _auto_deskew(gray)

        # Variant 1: plain grayscale
        results.append(gray)

        # Variant 2: contrast-boosted (helps faded thermal receipts)
        try:
            results.append(ImageEnhance.Contrast(gray).enhance(2.0))
        except Exception:
            pass

        # Variant 3: CLAHE + Otsu binarization (best for low-contrast scans)
        try:
            import cv2
            arr = np.array(gray, dtype=np.uint8)
            clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
            arr_c = clahe.apply(arr)
            _, arr_b = cv2.threshold(arr_c, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            arr_d = cv2.fastNlMeansDenoising(arr_b, h=10)
            results.append(Image.fromarray(arr_d))
        except ImportError:
            pass
        except Exception:
            pass

        # Variant 4: colour channel isolation (strips blue stamp ink)
        try:
            if pil_img.mode in ("RGB", "RGBA"):
                arr_c = np.array(pil_img.convert("RGB")).astype(np.float32)
                r_c, g_c, b_c = arr_c[:, :, 0], arr_c[:, :, 1], arr_c[:, :, 2]
                iso = np.clip(255 - (b_c - r_c) * 2, 0, 255).astype(np.uint8)
                results.append(Image.fromarray(iso))
        except Exception:
            pass

    except Exception:
        pass

    return results or [pil_img.convert("L")]


def _score_ocr_text(text: str) -> int:
    """Score OCR output quality: longer text with more receipt keywords scores higher."""
    l_txt = text.lower()
    kw_hits = sum(1 for k in _SCORE_KW if k in l_txt)
    return len(text.strip()) + kw_hits * 300


def _ocr_with_liteparse(path: str, parser) -> str:
    """Run LiteParse on an image path and return the extracted text."""
    try:
        res = parser.parse(path)
        return getattr(res, "markdown", "") or getattr(res, "text", "") or str(res)
    except Exception:
        return ""


def _ocr_with_tesseract(pil_img) -> str:
    """Run pytesseract as a fallback OCR engine (optional dependency)."""
    try:
        import pytesseract
        return pytesseract.image_to_string(pil_img)
    except Exception:
        return ""


def _merge_ocr_texts(*texts: str) -> str:
    """Merge OCR output from multiple engines, de-duplicating identical lines."""
    seen: set = set()
    merged = []
    for t in texts:
        if not t:
            continue
        for line in t.split("\n"):
            s = line.strip()
            if s and s.lower() not in seen:
                seen.add(s.lower())
                merged.append(s)
    return "\n".join(merged)


def _ocr_receipt(tmp_path: str, suffix: str, tmp_clean_files: list) -> str:
    """Full OCR pipeline (LiteParse-only, no API keys):

    Stage 1 — Preprocess (deskew, upscale, CLAHE, Otsu) then OCR with LiteParse.
    Stage 2 — If score < threshold, try 90/180/270° rotations.
    Stage 3 — If still low, merge with pytesseract output (if installed).

    All temp files are created via _make_tmp_path() to avoid Windows file-lock
    errors that occur with NamedTemporaryFile.
    """
    from liteparse import LiteParse

    candidate_imgs = _load_candidate_images(tmp_path, suffix, tmp_clean_files)
    if not candidate_imgs:
        return ""

    parser = LiteParse(output_format="markdown")
    best_text = ""
    best_score = -1

    def _save_and_ocr(img) -> tuple[str, int]:
        """Save PIL image to a fresh temp path, OCR it, return (text, score)."""
        path = _make_tmp_path(".jpg")
        img.save(path)                  # No open handle → PIL writes cleanly
        tmp_clean_files.append(path)
        text = _ocr_with_liteparse(path, parser)
        return text, _score_ocr_text(text)

    # Stage 1: preprocessed variants at original orientation
    for img in candidate_imgs:
        for variant in _preprocess_image(img):
            text, score = _save_and_ocr(variant)
            if score > best_score:
                best_score, best_text = score, text

    # Stage 2: rotation scan when confidence is low
    if best_score < _LOW_CONFIDENCE:
        for img in candidate_imgs:
            for rot in (90, 180, 270):
                rotated = img.rotate(rot, expand=True)
                for variant in _preprocess_image(rotated):
                    text, score = _save_and_ocr(variant)
                    if score > best_score:
                        best_score, best_text = score, text

    # Stage 3: pytesseract merge when LiteParse is still weak
    if best_score < _LOW_CONFIDENCE:
        for img in candidate_imgs:
            t = _ocr_with_tesseract(img)
            if t and t.strip():
                merged = _merge_ocr_texts(best_text, t)
                score = _score_ocr_text(merged)
                if score > best_score:
                    best_score, best_text = score, merged

    return best_text


# ── Statement Parsing ──────────────────────────────────────────────────────────

def _parse_bank_statement(tmp_path: str, ext: str) -> list[dict]:
    """Parse a bank statement CSV/Excel file and extract standard fields."""
    try:
        if ext == ".csv":
            df = pd.read_csv(tmp_path)
        else:
            df = pd.read_excel(tmp_path)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read file: {e}")

    # Standardize column names for fuzzy matching
    df.columns = df.columns.str.lower().str.strip()
    
    # Identify key columns
    date_col = None
    desc_col = None
    amount_col = None
    type_col = None # credit/debit or deposit/withdrawal
    credit_col = None
    debit_col = None

    for col in df.columns:
        if not date_col and any(k in col for k in ["date", "txn date", "value date"]):
            date_col = col
        elif not desc_col and any(k in col for k in ["narration", "description", "particulars", "remarks"]):
            desc_col = col
        elif not credit_col and any(k in col for k in ["credit", "deposit"]):
            credit_col = col
        elif not debit_col and any(k in col for k in ["debit", "withdrawal"]):
            debit_col = col
        elif not amount_col and any(k in col for k in ["amount"]):
            amount_col = col
        elif not type_col and any(k in col for k in ["type", "dr/cr"]):
            type_col = col

    if not date_col or not desc_col:
        raise HTTPException(status_code=422, detail="Could not identify Date and Description columns in the file.")

    if not amount_col and not (credit_col and debit_col):
         raise HTTPException(status_code=422, detail="Could not identify Amount or Credit/Debit columns in the file.")

    results = []
    
    # Process each row
    for _, row in df.iterrows():
        # Skip empty rows
        if pd.isna(row[date_col]):
            continue
            
        try:
            # Parse Date
            dt = pd.to_datetime(row[date_col], format="mixed", dayfirst=True)
            date_str = dt.strftime("%Y-%m-%d")
        except Exception:
            continue # Skip invalid date rows

        # Parse Description
        note = str(row[desc_col]).strip() if pd.notna(row[desc_col]) else "Bank Transaction"

        # Parse Amount and Type
        amount = 0.0
        txn_type = "expense"
        
        if credit_col and debit_col:
            cred = row[credit_col]
            deb = row[debit_col]
            
            if pd.notna(cred) and str(cred).strip() and float(str(cred).replace(",", "")) > 0:
                amount = float(str(cred).replace(",", ""))
                txn_type = "income"
            elif pd.notna(deb) and str(deb).strip() and float(str(deb).replace(",", "")) > 0:
                amount = float(str(deb).replace(",", ""))
                txn_type = "expense"
        elif amount_col:
            val = row[amount_col]
            if pd.notna(val):
                val_float = float(str(val).replace(",", ""))
                amount = abs(val_float)
                
                # Determine type
                if type_col and pd.notna(row[type_col]):
                    t_str = str(row[type_col]).lower()
                    if "cr" in t_str or "credit" in t_str or "deposit" in t_str:
                        txn_type = "income"
                    else:
                        txn_type = "expense"
                else:
                     # If amount is negative, assume expense. If positive, assume income (or vice versa depending on bank, this is a fallback)
                     if val_float < 0:
                         txn_type = "expense"
                     else:
                         # Without dr/cr col, we have to guess or assume expense. Let's assume expense for absolute amounts.
                         txn_type = "expense"
                         
        if amount == 0:
             continue # Skip zero amount rows
             
        category = _infer_category(note, "")
        
        results.append({
            "id": str(uuid.uuid4()),
            "date": date_str,
            "amount": amount,
            "type": txn_type,
            "scope": "personal",
            "category": category,
            "note": note[:100]
        })

    if not results:
        raise HTTPException(status_code=422, detail="No valid transactions found in the file.")
        
    return results


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
    
    for line in lines:
        if "BALANCE FORWARD" in line.upper() or "BROUGHT FORWARD" in line.upper():
            continue
            
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
        
        match2 = re.search(r"^\d{1,2}\s+[A-Za-z]{3}\s+\d{2,4}", desc)
        if match2:
            desc = desc.replace(match2.group(), "").strip()
            
        amount_val = 0.0
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
            "note": desc[:100].strip() or "Bank Transaction"
        })
        
    return results




# ── Import endpoint ────────────────────────────────────────────────────────────

@router.post("/entries/import/preview")
async def import_receipt_preview(
    file: UploadFile = File(...),
    current_user: CurrentUser = Depends(get_current_user),
    _ = Depends(require_premium)
):
    """Upload a receipt image/PDF or bank statement CSV/Excel.
    Returns a list of parsed draft entries for the user to review.
    Does NOT save to the database."""
    tmp_clean_files: list[str] = []

    try:
        suffix = os.path.splitext(file.filename or "")[1].lower() or ".jpg"
        allowed_extensions = {".jpg", ".jpeg", ".png", ".pdf", ".csv", ".xls", ".xlsx", ".webp"}
        if suffix not in allowed_extensions:
            raise HTTPException(status_code=415, detail="Unsupported file type")
            
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Empty file")
        if len(content) > 10 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="File too large. Max 10MB")

        # Write upload to a plain path — no open handle (Windows-safe)
        tmp_path = _make_tmp_path(suffix)
        with open(tmp_path, "wb") as f:
            f.write(content)
        tmp_clean_files.append(tmp_path)
        
        if suffix in [".csv", ".xls", ".xlsx"]:
             parsed_list = _parse_bank_statement(tmp_path, suffix)
             for item in parsed_list:
                 item["user_id"] = current_user.firebase_uid
             return parsed_list

        text = ""
        if suffix == ".pdf":
            text = _extract_text_from_pdf(tmp_path)
            
        if not text or len(text.strip()) < 50:
            text = _ocr_receipt(tmp_path, suffix, tmp_clean_files)

        if not text.strip():
            raise HTTPException(status_code=422, detail="Could not read any text from the file")
            
        if _is_bank_statement(text):
            parsed_list = _extract_bank_statement_from_text(text)
            if not parsed_list:
                raise HTTPException(status_code=422, detail="Detected bank statement but could not parse transactions")
            for item in parsed_list:
                item["user_id"] = current_user.firebase_uid
            return parsed_list

        parsed = extract_receipt_data_from_text(text)

        entry_dict = {
            "id": str(uuid.uuid4()),
            "user_id": current_user.firebase_uid,
            "date":     parsed["date"],
            "amount":   parsed["amount"],
            "type":     parsed.get("type", "expense"),
            "scope":    parsed.get("scope", "personal"),
            "category": parsed.get("category", "Other"),
            "note":     parsed.get("note", ""),
        }

        return [entry_dict]

    except HTTPException:
        raise
    except Exception as e:
        print(f"Import error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        for p in tmp_clean_files:
            if p and os.path.exists(p):
                try:
                    os.remove(p)
                except Exception:
                    pass

@router.post("/entries/import/confirm")
async def import_confirm(
    req: BulkConfirmRequest,
    current_user: CurrentUser = Depends(get_current_user),
    _ = Depends(require_premium)
):
    """Bulk insert an array of reviewed and confirmed entries."""
    if not req.entries:
        return {"inserted_count": 0}

    docs_to_insert = []
    for entry in req.entries:
        # Enforce security: ensure user_id matches
        if entry.user_id != current_user.firebase_uid:
            continue
        docs_to_insert.append(entry.model_dump())
        
    if not docs_to_insert:
        raise HTTPException(status_code=400, detail="No valid entries to insert")

    res = await db.db.entries.insert_many(docs_to_insert)
    return {"inserted_count": len(res.inserted_ids)}
