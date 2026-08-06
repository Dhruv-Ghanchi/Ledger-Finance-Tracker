import os
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent.parent.parent
load_dotenv(ROOT_DIR / '.env')

class Settings:
    MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
    DB_NAME = os.environ.get("DB_NAME", "finance_tracker")
    CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*")
    ENVIRONMENT = os.environ.get("ENVIRONMENT", "development")
    
    FIREBASE_CREDENTIALS = os.environ.get("FIREBASE_CREDENTIALS") # Should be a path to JSON or JSON string
    
    RAZORPAY_KEY_ID = os.environ.get("RAZORPAY_KEY_ID", "")
    RAZORPAY_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET", "")
    RAZORPAY_WEBHOOK_SECRET = os.environ.get("RAZORPAY_WEBHOOK_SECRET", "")
    RAZORPAY_PLAN_MONTHLY = os.environ.get("RAZORPAY_PLAN_MONTHLY", "")
    RAZORPAY_PLAN_YEARLY = os.environ.get("RAZORPAY_PLAN_YEARLY", "")

    # Email (SMTP) settings for sending contact-form messages
    SMTP_HOST = os.environ.get("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
    SMTP_USER = os.environ.get("SMTP_USER", "")
    SMTP_PASSWORD = (os.environ.get("SMTP_PASSWORD", "") or "").strip()
    CONTACT_EMAIL_TO = os.environ.get("CONTACT_EMAIL_TO", "dhruvghanchi.1@gmail.com")

settings = Settings()
