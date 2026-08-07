from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.db import db
from app.auth.firebase import init_firebase
from app.users.routes import router as users_router
from app.categories.routes import router as categories_router
from app.entries.routes import router as entries_router
from app.payments.routes import router as payments_router
from app.contact.routes import router as contact_router
from app.invoices.routes import router as invoices_router
from app.chat.routes import router as chat_router
from app.debts.routes import router as debts_router
import logging
import os
import asyncio
import requests

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

app = FastAPI(title="SaaS Finance Tracker API")

# Normalize CORS origins: strip whitespace AND trailing slashes.
# Browsers send Origin WITHOUT a trailing slash, so a config value like
# "https://ledger-dhruv-ghanchi.vercel.app/" would never exact-match.
cors_origins = [o.strip().rstrip("/") for o in settings.CORS_ORIGINS.split(",") if o.strip()]
if not cors_origins:
    cors_origins = ["*"]

# Allow any vercel.app / onrender.com subdomain regardless of ENVIRONMENT.
# Safe because allow_credentials=False. Browsers always send the Origin
# header without a trailing slash. Anchored with $ so it works with both
# re.match and re.fullmatch semantics.
allow_origin_regex = r"^https?://.*\.(vercel\.app|onrender\.com)$"

# If VERCEL_URL is set (Vercel does this automatically), allow that exact host too.
vercel_url = os.environ.get("VERCEL_URL")
if vercel_url:
    cors_origins.append(f"https://{vercel_url}")

logging.getLogger("uvicorn.error").info(
    "CORS enabled: origins=%s regex=%s", cors_origins, allow_origin_regex
)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=False,
    allow_origins=cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_origin_regex=allow_origin_regex,
)

async def keep_alive_task():
    while True:
        await asyncio.sleep(5 * 60)  # 5 minutes
        url = os.environ.get("RENDER_EXTERNAL_URL")
        if url:
            try:
                loop = asyncio.get_running_loop()
                await loop.run_in_executor(None, requests.get, url)
                logging.info(f"Pinged {url} to keep alive")
            except Exception as e:
                logging.error(f"Error pinging {url}: {e}")

@app.on_event("startup")
async def startup_event():
    init_firebase()
    db.connect()
    asyncio.create_task(keep_alive_task())

@app.on_event("shutdown")
async def shutdown_event():
    db.close()

app.include_router(users_router)
app.include_router(categories_router)
app.include_router(entries_router)
app.include_router(payments_router)
app.include_router(contact_router)
app.include_router(invoices_router)
app.include_router(chat_router)
app.include_router(debts_router)

@app.get("/")
@app.head("/")
async def root():
    return {"message": "Finance Tracker SaaS API"}
