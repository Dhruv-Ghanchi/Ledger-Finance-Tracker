import firebase_admin
from firebase_admin import credentials, auth
from fastapi import Header, HTTPException
from typing import Optional
from app.core.config import settings
import json
import logging

logger = logging.getLogger(__name__)

def init_firebase():
    if not firebase_admin._apps:
        try:
            if settings.FIREBASE_CREDENTIALS:
                if settings.FIREBASE_CREDENTIALS.startswith("{"):
                    cred_dict = json.loads(settings.FIREBASE_CREDENTIALS)
                    cred = credentials.Certificate(cred_dict)
                else:
                    cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS)
                firebase_admin.initialize_app(cred)
                logger.info("Firebase Admin initialized successfully.")
            else:
                logger.warning("FIREBASE_CREDENTIALS not set. Firebase Auth will fail.")
        except Exception as e:
            logger.error(f"Failed to initialize Firebase Admin: {e}")

class CurrentUser:
    def __init__(self, uid: str, email: str = None):
        self.firebase_uid = uid
        self.email = email

async def get_current_user(authorization: Optional[str] = Header(None)) -> CurrentUser:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid or missing Authorization header")
    
    token = authorization.split("Bearer ")[1]
    try:
        decoded_token = auth.verify_id_token(token)
        uid = decoded_token.get("uid")
        email = decoded_token.get("email")
        if not uid:
            raise HTTPException(status_code=401, detail="Invalid token: missing uid")
        return CurrentUser(uid=uid, email=email)
    except Exception as e:
        logger.error(f"Token verification failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid or expired token")
