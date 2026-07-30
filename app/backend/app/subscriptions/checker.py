from datetime import datetime, timezone
from app.core.db import db
from fastapi import HTTPException

async def has_premium_access(user_id: str) -> bool:
    user = await db.db.users.find_one({"firebase_uid": user_id})
    if not user:
        return False
        
    now = datetime.now(timezone.utc).isoformat()
    
    if user.get("plan") == "trial" and user.get("trial_end") and now < user.get("trial_end"):
        return True
        
    if user.get("subscription_status") == "active" and user.get("subscription_expiry"):
        if now < user.get("subscription_expiry"):
            return True
            
    if user.get("plan") == "lifetime":
        return True
        
    return False

async def require_premium(user_id: str):
    if not await has_premium_access(user_id):
        raise HTTPException(status_code=403, detail="Premium access required")
