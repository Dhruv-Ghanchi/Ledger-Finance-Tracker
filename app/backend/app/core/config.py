import os
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent.parent.parent
load_dotenv(ROOT_DIR / '.env')

class Settings:
    MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
    DB_NAME = os.environ.get("DB_NAME", "finance_tracker")
    CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*")
    
    FIREBASE_CREDENTIALS = os.environ.get("FIREBASE_CREDENTIALS") # Should be a path to JSON or JSON string
    
    RAZORPAY_KEY_ID = os.environ.get("RAZORPAY_KEY_ID", "")
    RAZORPAY_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET", "")
    RAZORPAY_PLAN_MONTHLY = os.environ.get("RAZORPAY_PLAN_MONTHLY", "")
    RAZORPAY_PLAN_YEARLY = os.environ.get("RAZORPAY_PLAN_YEARLY", "")
    
settings = Settings()
