from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional, Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator
from datetime import datetime, timezone
import re
import uuid

from app.auth.firebase import get_current_user, CurrentUser
from app.core.db import db
from app.subscriptions.checker import has_premium_access

router = APIRouter(prefix="/api/debts", tags=["debts"])

# ── Models ─────────────────────────────────────────────────────────────────────

_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")

def _check_date_str(v: str) -> str:
    if not _DATE_RE.match(v):
        raise ValueError("date must be in YYYY-MM-DD format")
    try:
        datetime.strptime(v, "%Y-%m-%d")
    except ValueError:
        raise ValueError("date is not a valid calendar date")
    return v

def _check_positive_amount(v: float) -> float:
    if v <= 0:
        raise ValueError("amount must be greater than 0")
    return v

class Debt(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    person_name: str
    amount: float
    type: Literal["to_pay", "to_collect"]
    expected_date: str
    note: Optional[str] = ""
    status: Literal["pending", "settled"] = "pending"
    settled_at: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class DebtCreate(BaseModel):
    person_name: str
    amount: float
    type: Literal["to_pay", "to_collect"]
    expected_date: str
    note: Optional[str] = ""

    _validate_date = field_validator("expected_date")(_check_date_str)
    _validate_amount = field_validator("amount")(_check_positive_amount)

class DebtUpdate(BaseModel):
    person_name: Optional[str] = None
    amount: Optional[float] = None
    type: Optional[Literal["to_pay", "to_collect"]] = None
    expected_date: Optional[str] = None
    note: Optional[str] = None

    @field_validator("expected_date")
    @classmethod
    def _validate_date(cls, v):
        return _check_date_str(v) if v is not None else v

    @field_validator("amount")
    @classmethod
    def _validate_amount(cls, v):
        return _check_positive_amount(v) if v is not None else v

class DebtSettle(BaseModel):
    generate_entry: bool = True
    scope: Literal["personal", "business"] = "personal"
    category: Optional[str] = None

    @field_validator("category")
    @classmethod
    def _require_category_when_generating_entry(cls, v, info):
        if info.data.get("generate_entry", True) and not v:
            raise ValueError("category is required when generating a matching entry")
        return v

# ── Routes ─────────────────────────────────────────────────────────────────────

@router.get("", response_model=List[Debt])
async def get_debts(current_user: CurrentUser = Depends(get_current_user)):
    docs = await db.db.debts.find({"user_id": current_user.firebase_uid}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return docs

@router.post("", response_model=Debt)
async def create_debt(
    req: DebtCreate,
    current_user: CurrentUser = Depends(get_current_user),
):
    # Free users can have up to 5 active debts
    is_premium = await has_premium_access(current_user.firebase_uid)
    if not is_premium:
        count = await db.db.debts.count_documents({"user_id": current_user.firebase_uid, "status": "pending"})
        if count >= 5:
            raise HTTPException(status_code=403, detail="Free plan allows a maximum of 5 pending IOUs. Please upgrade to Premium or settle existing IOUs.")
            
    debt = Debt(
        user_id=current_user.firebase_uid,
        **req.model_dump()
    )
    await db.db.debts.insert_one(debt.model_dump())
    return debt

@router.put("/{debt_id}", response_model=Debt)
async def update_debt(
    debt_id: str,
    req: DebtUpdate,
    current_user: CurrentUser = Depends(get_current_user)
):
    update_data = {k: v for k, v in req.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
        
    res = await db.db.debts.find_one_and_update(
        {"id": debt_id, "user_id": current_user.firebase_uid},
        {"$set": update_data},
        return_document=True
    )
    if not res:
        raise HTTPException(status_code=404, detail="Debt not found")
        
    res.pop("_id", None)
    return res

@router.delete("/{debt_id}")
async def delete_debt(
    debt_id: str,
    current_user: CurrentUser = Depends(get_current_user)
):
    res = await db.db.debts.delete_one({"id": debt_id, "user_id": current_user.firebase_uid})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Debt not found")
    return {"status": "ok"}

@router.post("/{debt_id}/settle")
async def settle_debt(
    debt_id: str,
    req: DebtSettle,
    current_user: CurrentUser = Depends(get_current_user)
):
    debt = await db.db.debts.find_one({"id": debt_id, "user_id": current_user.firebase_uid})
    if not debt:
        raise HTTPException(status_code=404, detail="Debt not found")
    if debt.get("status") == "settled":
        raise HTTPException(status_code=400, detail="Debt is already settled")
        
    # Mark as settled
    now = datetime.now(timezone.utc).isoformat()
    await db.db.debts.update_one(
        {"_id": debt["_id"]},
        {"$set": {"status": "settled", "settled_at": now}}
    )

    debt["status"] = "settled"
    debt["settled_at"] = now
    debt.pop("_id", None)

    if not req.generate_entry:
        return {"debt": debt, "entry": None}

    # Create corresponding entry
    entry_type = "expense" if debt["type"] == "to_pay" else "income"
    # E.g. "Paid John Doe" or "Collected from Jane Doe"
    action = "Paid" if debt["type"] == "to_pay" else "Collected from"
    note = f"{action} {debt['person_name']} - {debt.get('note', '')}".strip()

    entry_date = datetime.now().strftime("%Y-%m-%d")

    entry = {
        "id": str(uuid.uuid4()),
        "user_id": current_user.firebase_uid,
        "date": entry_date,
        "amount": debt["amount"],
        "type": entry_type,
        "scope": req.scope,
        "category": req.category,
        "note": note
    }

    await db.db.entries.insert_one(entry)
    entry.pop("_id", None)

    return {"debt": debt, "entry": entry}
