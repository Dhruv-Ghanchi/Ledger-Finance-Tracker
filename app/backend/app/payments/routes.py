import razorpay
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Literal
from datetime import datetime, timezone
import uuid
from app.core.config import settings
from app.auth.firebase import get_current_user, CurrentUser
from app.core.db import db
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/payments", tags=["payments"])

def get_rzp_client():
    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        return None
    return razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

class CreateSubscriptionRequest(BaseModel):
    plan: Literal["monthly", "yearly"]

@router.post("/subscribe")
async def create_subscription(body: CreateSubscriptionRequest, current_user: CurrentUser = Depends(get_current_user)):
    user = await db.db.users.find_one({"firebase_uid": current_user.firebase_uid})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    client = get_rzp_client()
    if not client:
        raise HTTPException(status_code=500, detail="Razorpay is not configured")
        
    customer_id = user.get("razorpay_customer_id")
    if not customer_id:
        try:
            customer = client.customer.create({
                "name": user.get("name") or "User",
                "email": user.get("email"),
                "notes": {"firebase_uid": current_user.firebase_uid}
            })
            customer_id = customer["id"]
            await db.db.users.update_one({"firebase_uid": current_user.firebase_uid}, {"$set": {"razorpay_customer_id": customer_id}})
        except Exception as e:
            logger.error(f"Error creating razorpay customer: {e}")
            raise HTTPException(status_code=500, detail=f"Error creating customer: {e}")
            
    plan_id = settings.RAZORPAY_PLAN_MONTHLY if body.plan == "monthly" else settings.RAZORPAY_PLAN_YEARLY
    if not plan_id:
        raise HTTPException(status_code=500, detail="Plan ID not configured in environment")
        
    try:
        sub = client.subscription.create({
            "plan_id": plan_id,
            "customer_id": customer_id,
            "total_count": 120,
            "notes": {"firebase_uid": current_user.firebase_uid}
        })
        
        sub_doc = {
            "id": str(uuid.uuid4()),
            "user_id": current_user.firebase_uid,
            "razorpay_customer_id": customer_id,
            "razorpay_subscription_id": sub["id"],
            "plan": body.plan,
            "status": sub["status"],
            "start_date": None,
            "expiry_date": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.db.subscriptions.insert_one(sub_doc)
        
        return {"subscription_id": sub["id"]}
    except Exception as e:
        logger.error(f"Error creating razorpay subscription: {e}")
        raise HTTPException(status_code=500, detail=f"Error creating subscription: {e}")

@router.post("/webhook")
async def razorpay_webhook(request: Request):
    try:
        data = await request.json()
    except:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")
        
    event = data.get("event")
    
    if event in ["subscription.charged", "subscription.activated", "subscription.updated"]:
        sub_data = data["payload"]["subscription"]["entity"]
        sub_id = sub_data["id"]
        status = sub_data["status"]
        notes = sub_data.get("notes", {})
        uid = notes.get("firebase_uid")
        
        start = datetime.fromtimestamp(sub_data["current_start"], tz=timezone.utc).isoformat() if sub_data.get("current_start") else None
        end = datetime.fromtimestamp(sub_data["current_end"], tz=timezone.utc).isoformat() if sub_data.get("current_end") else None
        
        updates = {"status": status}
        if start: updates["start_date"] = start
        if end: updates["expiry_date"] = end
        
        await db.db.subscriptions.update_one(
            {"razorpay_subscription_id": sub_id},
            {"$set": updates}
        )
        
        if uid and status in ["active", "authenticated"]:
            sub_doc = await db.db.subscriptions.find_one({"razorpay_subscription_id": sub_id})
            if sub_doc:
                await db.db.users.update_one(
                    {"firebase_uid": uid},
                    {"$set": {
                        "plan": sub_doc["plan"],
                        "subscription_status": "active",
                        "subscription_expiry": end
                    }}
                )
    
    elif event in ["subscription.cancelled", "subscription.halted"]:
        sub_data = data["payload"]["subscription"]["entity"]
        sub_id = sub_data["id"]
        status = sub_data["status"]
        notes = sub_data.get("notes", {})
        uid = notes.get("firebase_uid")
        
        await db.db.subscriptions.update_one(
            {"razorpay_subscription_id": sub_id},
            {"$set": {"status": status}}
        )
        
        if uid:
            await db.db.users.update_one(
                {"firebase_uid": uid},
                {"$set": {"subscription_status": status}}
            )
            
    return {"status": "ok"}
