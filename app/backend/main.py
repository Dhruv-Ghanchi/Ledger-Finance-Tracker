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

LAUNCH_PROMO_CODE = "EARLYACCESS"  # rename freely; the cap below is what actually matters
LAUNCH_PROMO_MAX_REDEMPTIONS = 11

async def seed_promo_codes():
    """Seed promo codes (idempotent).

    - LIFETIMEFREE: handed out manually/selectively by us, one at a time — no cap.
    - EARLYACCESS (LAUNCH_PROMO_CODE): the public launch promo, capped at
      LAUNCH_PROMO_MAX_REDEMPTIONS total redemptions. Advertise this same
      number publicly — the cap is enforced atomically in apply_promo_code(),
      so once it's claimed, later redeemers get an honest "this offer has ended".
    """
    try:
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc).isoformat()

        existing = await db.db.promo_codes.find_one({"code": "LIFETIMEFREE"})
        if not existing:
            await db.db.promo_codes.insert_one(
                {"code": "LIFETIMEFREE", "plan": "lifetimefree", "days": None, "active": True, "created_at": now}
            )
            logging.info("Seeded promo code: LIFETIMEFREE")

        launch = await db.db.promo_codes.find_one({"code": LAUNCH_PROMO_CODE})
        if not launch:
            await db.db.promo_codes.insert_one({
                "code": LAUNCH_PROMO_CODE, "plan": "lifetimefree", "days": None, "active": True,
                "max_redemptions": LAUNCH_PROMO_MAX_REDEMPTIONS, "redeemed_count": 0, "created_at": now,
            })
            logging.info("Seeded promo code: %s (max %d redemptions)", LAUNCH_PROMO_CODE, LAUNCH_PROMO_MAX_REDEMPTIONS)
    except Exception as e:
        logging.error("Failed to seed promo codes: %s", e)



@app.on_event("startup")
async def startup_event():
    init_firebase()
    db.connect()
    await seed_promo_codes()

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
