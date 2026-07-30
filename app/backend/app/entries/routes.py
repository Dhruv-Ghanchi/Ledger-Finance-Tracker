from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse
from typing import List, Optional, Literal
from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime, timezone
import uuid
import io
import csv
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
