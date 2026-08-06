from datetime import datetime, timezone
from app.core.db import db
from fastapi import HTTPException, Depends
from app.auth.firebase import get_current_user, CurrentUser

def _parse_utc(value: str) -> datetime:
    """Parse an ISO timestamp into a timezone-aware UTC datetime. Naive values are assumed UTC."""
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(str(value))
    except (TypeError, ValueError):
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)

async def has_premium_access(user_id: str) -> bool:
    user = await db.db.users.find_one({"firebase_uid": user_id})
    if not user:
        return False

    now = datetime.now(timezone.utc)

    # Lifetime plans never expire.
    if user.get("plan") in ("lifetime", "lifetimefree"):
        return True

    # Active trial grants full premium access until trial_end.
    if user.get("plan") == "trial":
        trial_end = _parse_utc(user.get("trial_end"))
        if trial_end and now < trial_end:
            return True

    # Paid subscription.
    if user.get("subscription_status") == "active":
        sub_expiry = _parse_utc(user.get("subscription_expiry"))
        if sub_expiry and now < sub_expiry:
            return True

    return False

async def require_premium(current_user: CurrentUser = Depends(get_current_user)):
    if not await has_premium_access(current_user.firebase_uid):
        raise HTTPException(status_code=403, detail="Premium access required")
