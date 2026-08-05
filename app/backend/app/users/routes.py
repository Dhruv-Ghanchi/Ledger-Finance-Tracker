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
            "subscription_status": "active",
            "trial_start": now.isoformat(),
            "trial_end": (now + timedelta(days=60)).isoformat(),
            "subscription_expiry": None
        }
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

