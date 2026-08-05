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
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

app = FastAPI(title="SaaS Finance Tracker API")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=False,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    init_firebase()
    db.connect()

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

@app.get("/")
async def root():
    return {"message": "Finance Tracker SaaS API"}
