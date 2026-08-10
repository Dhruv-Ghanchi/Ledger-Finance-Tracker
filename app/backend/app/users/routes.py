from fastapi import APIRouter, Depends, Body, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone, timedelta
from firebase_admin import auth as firebase_auth
from app.auth.firebase import get_current_user, CurrentUser
from app.core.db import db
import logging
import uuid

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/users", tags=["users"])

TRIAL_DAYS = 180  # 6 months

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
) -> tuple[dict, Optional[str]]:
    """Apply a valid promo code to a user.

    Returns (update_dict, status). status is None if no code was submitted,
    otherwise one of "applied", "already_used", "invalid", "exhausted" — the
    caller surfaces this so redeemers of a capacity-limited code (see
    `max_redemptions` below) see "this offer has ended" rather than a generic
    invalid-code message once the real cap is hit.
    """
    if not promo_code or not promo_code.strip():
        return {}, None
    if user.get("promo_used"):
        return {}, "already_used"

    code = promo_code.strip().upper()
    promo = await db.db.promo_codes.find_one({"code": code, "active": True})
    if not promo:
        return {}, "invalid"

    if promo.get("max_redemptions") is not None:
        # Atomically claim one of the limited slots so two concurrent
        # redemptions can't both read redeemed_count before either increments it.
        claimed = await db.db.promo_codes.find_one_and_update(
            {"code": code, "active": True, "$expr": {"$lt": ["$redeemed_count", "$max_redemptions"]}},
            {"$inc": {"redeemed_count": 1}},
        )
        if not claimed:
            return {}, "exhausted"

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
    return update, "applied"


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
            "last_active": now.isoformat(),
            "plan": "trial",
            "subscription_status": "trial",
            "trial_start": now.isoformat(),
            "trial_end": (now + timedelta(days=TRIAL_DAYS)).isoformat(),
            "subscription_expiry": None
        }
        # Apply promo code on first sync (registration)
        promo_updates, promo_status = await apply_promo_code(user_doc, body.promo_code if body else None, now)
        user_doc.update(promo_updates)
        await db.db.users.insert_one(user_doc.copy())
        
        cats = generate_default_categories(current_user.firebase_uid)
        if cats:
            await db.db.categories.insert_many(cats)
        
        user = user_doc
    else:
        updates = {"last_active": now.isoformat()}
        if body:
            if body.name and not user.get("name"):
                updates["name"] = body.name
            if body.profile_picture and not user.get("profile_picture"):
                updates["profile_picture"] = body.profile_picture
            if body.phone and not user.get("phone"):
                updates["phone"] = body.phone
                
        # Apply promo code if provided and not yet used
        promo_updates, promo_status = await apply_promo_code(user, body.promo_code if body else None, now)
        updates.update(promo_updates)
                
        # One-time 6-month trial grant for existing users who never had one.
        # Covers users created before the trial feature, plus anyone currently
        # on the free plan. A user's trial is never reset once started.
        existing_plan = user.get("plan")
        if not user.get("trial_start") and not user.get("trial_end") and existing_plan not in (
            "monthly", "yearly", "lifetime", "lifetimefree"
        ):
            updates["plan"] = "trial"
            updates["subscription_status"] = "trial"
            updates["trial_start"] = now.isoformat()
            updates["trial_end"] = (now + timedelta(days=TRIAL_DAYS)).isoformat()
            updates["subscription_expiry"] = None
                
        if updates:
            updates["updated_at"] = now.isoformat()
            await db.db.users.update_one({"firebase_uid": current_user.firebase_uid}, {"$set": updates})
            user.update(updates)

    if promo_status:
        # Transient — not persisted, just tells the caller which toast to show
        # (e.g. "this offer has ended" for an exhausted capacity-limited code).
        user = {**user, "promo_status": promo_status}
    return user

async def purge_and_delete_user(uid: str) -> None:
    """Permanently delete a user's account and every piece of associated data.

    Shared by the self-service DELETE /me endpoint and the inactivity purge
    script (deactivate_inactive_users.py) so both paths purge the exact same
    set of collections — a list that would otherwise drift out of sync as new
    user-scoped collections get added.

    Best-effort on the Razorpay cancellation (a stuck gateway shouldn't block
    a deletion) but the local data purge and Firebase identity removal must
    both succeed, or callers can't rely on this claiming the account is gone
    when the person could still log back in.
    """
    sub = await db.db.subscriptions.find_one({"user_id": uid})
    if sub and sub.get("razorpay_subscription_id") and sub.get("status") not in ("cancelled", "completed"):
        try:
            from app.payments.routes import get_rzp_client
            client = get_rzp_client()
            if client:
                client.subscription.cancel(sub["razorpay_subscription_id"])
        except Exception as e:
            logger.error(f"Error cancelling subscription during account deletion for {uid}: {e}")

    for collection in ("entries", "categories", "debts", "subscriptions", "payments"):
        await db.db[collection].delete_many({"user_id": uid})
    await db.db.users.delete_one({"firebase_uid": uid})

    firebase_auth.delete_user(uid)


@router.delete("/me")
async def delete_account(current_user: CurrentUser = Depends(get_current_user)):
    """Permanently delete the current user's account and all associated data."""
    try:
        await purge_and_delete_user(current_user.firebase_uid)
    except Exception as e:
        logger.error(f"Error deleting Firebase auth user {current_user.firebase_uid}: {e}")
        raise HTTPException(status_code=500, detail="Your data was deleted, but we couldn't remove your login. Contact support to finish closing the account.")

    return {"ok": True}


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

