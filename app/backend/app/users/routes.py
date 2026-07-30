from fastapi import APIRouter, Depends
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

@router.post("/sync")
async def sync_user(current_user: CurrentUser = Depends(get_current_user)):
    user = await db.db.users.find_one({"firebase_uid": current_user.firebase_uid}, {"_id": 0})
    now = datetime.now(timezone.utc)
    
    if not user:
        user_doc = {
            "firebase_uid": current_user.firebase_uid,
            "email": current_user.email,
            "name": "",
            "profile_picture": "",
            "provider": "", 
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
            "plan": "trial",
            "subscription_status": "active",
            "trial_start": now.isoformat(),
            "trial_end": (now + timedelta(days=7)).isoformat(),
            "subscription_expiry": None
        }
        await db.db.users.insert_one(user_doc.copy())
        
        cats = generate_default_categories(current_user.firebase_uid)
        if cats:
            await db.db.categories.insert_many(cats)
        
        return user_doc
    
    return user
