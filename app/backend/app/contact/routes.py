from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, timezone
import uuid
from app.auth.firebase import get_current_user, CurrentUser
from app.core.db import db
from app.core.email import send_email
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/contact", tags=["contact"])

# Simple in-memory rate limiting (for production, use Redis)
rate_limit_store = {}

RATE_LIMIT_WINDOW = 3600  # 1 hour
RATE_LIMIT_MAX_REQUESTS = 5  # 5 requests per hour per IP

class ContactRequest(BaseModel):
    name: str
    email: EmailStr
    message: str

def check_rate_limit(ip: str) -> bool:
    now = datetime.now(timezone.utc).timestamp()
    if ip not in rate_limit_store:
        rate_limit_store[ip] = []
    
    # Clean old entries
    rate_limit_store[ip] = [ts for ts in rate_limit_store[ip] if now - ts < RATE_LIMIT_WINDOW]
    
    if len(rate_limit_store[ip]) >= RATE_LIMIT_MAX_REQUESTS:
        return False
    
    rate_limit_store[ip].append(now)
    return True

@router.post("")
async def submit_contact(request: Request, body: ContactRequest):
    # Get client IP
    client_ip = request.client.host if request.client else "unknown"
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        client_ip = forwarded_for.split(",")[0].strip()
    
    # Check rate limit
    if not check_rate_limit(client_ip):
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Please try again later."
        )
    
    # Store contact submission
    contact_doc = {
        "id": str(uuid.uuid4()),
        "name": body.name,
        "email": body.email,
        "message": body.message,
        "ip": client_ip,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": "new"
    }
    
    await db.db.contacts.insert_one(contact_doc)
    
    logger.info(f"Contact form submitted by {body.email} from IP {client_ip}")
    
    # Notify the site owner by email
    subject = f"New contact message from {body.name}"
    plain_body = (
        f"New contact form submission on the Ledger landing page.\n\n"
        f"Name: {body.name}\n"
        f"Email: {body.email}\n\n"
        f"Message:\n{body.message}\n"
    )
    html_body = (
        "<h3>New contact form submission on the Ledger landing page</h3>"
        f"<p><strong>Name:</strong> {body.name}</p>"
        f"<p><strong>Email:</strong> <a href=\"mailto:{body.email}\">{body.email}</a></p>"
        f"<p><strong>Message:</strong></p>"
        f"<blockquote>{body.message}</blockquote>"
    )
    email_sent = await send_email(subject, settings.CONTACT_EMAIL_TO, plain_body, html_body)
    
    return {"ok": True, "message": "Message sent successfully", "email_sent": email_sent}