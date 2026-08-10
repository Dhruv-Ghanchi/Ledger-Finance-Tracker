from fastapi import APIRouter, Depends, Body, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone, timedelta
from app.auth.firebase import get_current_user, CurrentUser
from app.core.db import db
import uuid

router = APIRouter(prefix="/api/users", tags=["users"])

def generate_default_categories(user_id: str):
    now = datetime.now(timezone.utc).isoformat()
    incomes = ["Salary", "Business Income", "Investment", "Other"]
    expenses = ["Food", "Travel", "Shopping", "Bills", "Health", "Education", "Other"]
    
    docs = []
    for name in incomes:
        docs.append({"id": str(uuid.uuid4()), "user_id": user_id, "name": name, "type": "income", "is_preset": True, "created_at": now})
    for name in expenses:
        docs.append({"id": str(uuid.uuid4()), "user_id": user_id, "name": name, "type": "expense", "is_preset": True, "created_at": now})
    return docs

class SyncRequest(BaseModel):
    name: Optional[str] = None
    profile_picture: Optional[str] = None
    phone: Optional[str] = None
    provider: Optional[str] = None
    promo_code: Optional[str] = None


async def apply_promo_code(
    user: dict,
    promo_code: Optional[str],
    now: datetime,
) -> dict:
    """Apply a valid promo code to a user. Returns the update dict (empty if none)."""
    if not promo_code or not promo_code.strip():
        return {}
    if user.get("promo_used"):
        return {}

    code = promo_code.strip().upper()
    promo = await db.db.promo_codes.find_one({"code": code, "active": True})
    if not promo:
        return {}

    plan = promo.get("plan", "monthly")
    update = {
        "plan": plan,
        "subscription_status": "active",
        "promo_used": True,
        "promo_code": code,
    }
    if plan in ("lifetime", "lifetimefree"):
        # Lifetime plans never expire — has_premium_access() grants access
        # purely off `plan`, no expiry date needed or shown.
        update["subscription_expiry"] = None
        update["promo_expiry"] = None
    else:
        days = int(promo.get("days", 30))
        end = (now + timedelta(days=days)).isoformat()
        update["subscription_expiry"] = end
        update["promo_expiry"] = end
    return update


@router.post("/sync")
async def sync_user(body: Optional[SyncRequest] = None, current_user: CurrentUser = Depends(get_current_user)):
    user = await db.db.users.find_one({"firebase_uid": current_user.firebase_uid}, {"_id": 0})
    now = datetime.now(timezone.utc)
    
    if not user:
        user_doc = {
            "firebase_uid": current_user.firebase_uid,
            "email": current_user.email,
            "name": body.name if body and body.name else "",
            "profile_picture": body.profile_picture if body and body.profile_picture else "",
            "phone": body.phone if body and body.phone else "",
            "provider": body.provider if body and body.provider else "", 
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
            "plan": "trial",
            "subscription_status": "trial",
            "trial_start": now.isoformat(),
            "trial_end": (now + timedelta(days=60)).isoformat(),
            "subscription_expiry": None
        }
        # Apply promo code on first sync (registration)
        promo_updates = await apply_promo_code(user_doc, body.promo_code if body else None, now)
        user_doc.update(promo_updates)
        await db.db.users.insert_one(user_doc.copy())
        
        cats = generate_default_categories(current_user.firebase_uid)
        if cats:
            await db.db.categories.insert_many(cats)
        
        user = user_doc
    else:
        updates = {}
        if body:
            if body.name and not user.get("name"):
                updates["name"] = body.name
            if body.profile_picture and not user.get("profile_picture"):
                updates["profile_picture"] = body.profile_picture
            if body.phone and not user.get("phone"):
                updates["phone"] = body.phone
                
        # Apply promo code if provided and not yet used
        promo_updates = await apply_promo_code(user, body.promo_code if body else None, now)
        updates.update(promo_updates)
                
        # One-time 60-day trial grant for existing users who never had one.
        # Covers users created before the trial feature, plus anyone currently
        # on the free plan. A user's trial is never reset once started.
        existing_plan = user.get("plan")
        if not user.get("trial_start") and not user.get("trial_end") and existing_plan not in (
            "monthly", "yearly", "lifetime", "lifetimefree"
        ):
            updates["plan"] = "trial"
            updates["subscription_status"] = "trial"
            updates["trial_start"] = now.isoformat()
            updates["trial_end"] = (now + timedelta(days=60)).isoformat()
            updates["subscription_expiry"] = None
                
        if updates:
            updates["updated_at"] = now.isoformat()
            await db.db.users.update_one({"firebase_uid": current_user.firebase_uid}, {"$set": updates})
            user.update(updates)
            
    return user

@router.put("/profile")
async def update_profile(body: SyncRequest, current_user: CurrentUser = Depends(get_current_user)):
    user = await db.db.users.find_one({"firebase_uid": current_user.firebase_uid})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    updates = {}
    if body.name is not None:
        updates["name"] = body.name
    if body.profile_picture is not None:
        updates["profile_picture"] = body.profile_picture
    if body.phone is not None:
        updates["phone"] = body.phone
        
    if updates:
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.db.users.update_one({"firebase_uid": current_user.firebase_uid}, {"$set": updates})
        
    return await db.db.users.find_one({"firebase_uid": current_user.firebase_uid}, {"_id": 0})

