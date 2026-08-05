from razorpay.errors import SignatureVerificationError
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from pydantic import BaseModel
from typing import Literal, Optional
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

@router.get("/subscription")
async def get_subscription(current_user: CurrentUser = Depends(get_current_user)):
    sub = await db.db.subscriptions.find_one(
        {"user_id": current_user.firebase_uid},
        {"_id": 0, "razorpay_customer_id": 0, "razorpay_subscription_id": 0}
    )
    if not sub:
        return {"plan": "free", "status": "inactive"}
    return sub

@router.get("/history")
async def get_payment_history(current_user: CurrentUser = Depends(get_current_user)):
    payments = await db.db.payments.find(
        {"user_id": current_user.firebase_uid},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return payments

@router.post("/cancel")
async def cancel_subscription(current_user: CurrentUser = Depends(get_current_user)):
    user = await db.db.users.find_one({"firebase_uid": current_user.firebase_uid})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    sub = await db.db.subscriptions.find_one({"user_id": current_user.firebase_uid})
    if not sub or not sub.get("razorpay_subscription_id"):
        raise HTTPException(status_code=400, detail="No active subscription found")
    
    client = get_rzp_client()
    if not client:
        raise HTTPException(status_code=500, detail="Razorpay is not configured")
    
    try:
        # Cancel at end of billing cycle
        client.subscription.cancel(sub["razorpay_subscription_id"])
        
        await db.db.subscriptions.update_one(
            {"razorpay_subscription_id": sub["razorpay_subscription_id"]},
            {"$set": {"status": "cancelled"}}
        )
        
        await db.db.users.update_one(
            {"firebase_uid": current_user.firebase_uid},
            {"$set": {"subscription_status": "cancelled"}}
        )
        
        return {"ok": True, "message": "Subscription cancelled successfully"}
    except Exception as e:
        logger.error(f"Error cancelling subscription: {e}")
        raise HTTPException(status_code=500, detail=f"Error cancelling subscription: {e}")

@router.post("/webhook")
async def razorpay_webhook(request: Request, x_razorpay_signature: str = Header(None)):
    body_bytes = await request.body()
    try:
        data = await request.json()
    except:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")
        
    client = get_rzp_client()
    if client and settings.RAZORPAY_WEBHOOK_SECRET:
        if not x_razorpay_signature:
            raise HTTPException(status_code=400, detail="Missing signature")
        try:
            client.utility.verify_webhook_signature(
                body_bytes.decode(), x_razorpay_signature, settings.RAZORPAY_WEBHOOK_SECRET
            )
        except SignatureVerificationError:
            raise HTTPException(status_code=400, detail="Invalid signature")
        
    event = data.get("event")
    
    if event in ["subscription.charged", "subscription.activated", "subscription.updated"]:
        sub_data = data["payload"]["subscription"]["entity"]
        sub_id = sub_data["id"]
        status = sub_data["status"]
        notes = sub_data.get("notes", {})
        uid = notes.get("firebase_uid")
        
        start = datetime.fromtimestamp(sub_data["current_start"], tz=timezone.utc).isoformat() if sub_data.get("current_start") else None
        end = datetime.fromtimestamp(sub_data["current_end"], tz=timezone.utc).isoformat() if sub_data.get("current_end") else None
        
        # Get plan from our stored subscription
        sub_doc = await db.db.subscriptions.find_one({"razorpay_subscription_id": sub_id})
        plan = sub_doc.get("plan", "monthly") if sub_doc else "monthly"
        
        # Get amount from payment
        amount = sub_data.get("amount", 0)
        payment_id = sub_data.get("payment_id")
        
        updates = {"status": status}
        if start: updates["start_date"] = start
        if end: updates["expiry_date"] = end
        
        await db.db.subscriptions.update_one(
            {"razorpay_subscription_id": sub_id},
            {"$set": updates}
        )
        
        # Record payment
        if event == "subscription.charged" and payment_id:
            payment_doc = {
                "id": str(uuid.uuid4()),
                "user_id": uid,
                "razorpay_payment_id": payment_id,
                "razorpay_subscription_id": sub_id,
                "plan": plan,
                "amount": amount,  # in paise from Razorpay
                "status": "captured",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.db.payments.insert_one(payment_doc)
        
        if uid and status in ["active", "authenticated"]:
            if sub_doc:
                await db.db.users.update_one(
                    {"firebase_uid": uid},
                    {"$set": {
                        "plan": plan,
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
            
    elif event == "payment.captured":
        # Handle one-time payments (if any)
        payment_data = data["payload"]["payment"]["entity"]
        payment_id = payment_data["id"]
        amount = payment_data["amount"]
        notes = payment_data.get("notes", {})
        uid = notes.get("firebase_uid")
        
        if uid:
            payment_doc = {
                "id": str(uuid.uuid4()),
                "user_id": uid,
                "razorpay_payment_id": payment_id,
                "amount": amount,
                "status": "captured",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.db.payments.insert_one(payment_doc)

    return {"status": "ok"}
