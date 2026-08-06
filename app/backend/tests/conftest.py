import asyncio
import os
import sys
import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime, timezone, timedelta

import httpx

from app.auth.firebase import get_current_user, CurrentUser
from app.core.db import db
from main import app

TEST_UID = "test-user-123"

# One shared event loop for the whole session. Motor clients bind to the loop
# they are created on, so mixing loops (e.g. TestClient's internal loop) breaks.
_LOOP = asyncio.new_event_loop()


def run_async(coro):
    return _LOOP.run_until_complete(coro)


@pytest.fixture(scope="session", autouse=True)
def _session_loop():
    yield
    if db.client is not None:
        db.client.close()
        db.client = None
        db.db = None
    _LOOP.close()


@pytest.fixture()
def connected_db():
    """Connect MongoDB once per test on the shared loop."""
    if db.db is None:
        db.connect()
    yield db.db


async def _seed_premium_user(uid=TEST_UID):
    now = datetime.now(timezone.utc)
    await db.db.users.delete_one({"firebase_uid": uid})
    await db.db.categories.delete_many({"user_id": uid})
    await db.db.users.insert_one({
        "firebase_uid": uid,
        "email": "test@example.com",
        "plan": "trial",
        "subscription_status": "trial",
        "trial_start": now.isoformat(),
        "trial_end": (now + timedelta(days=60)).isoformat(),
        "subscription_expiry": None,
    })


async def _cleanup_user(uid=TEST_UID):
    await db.db.users.delete_one({"firebase_uid": uid})
    await db.db.categories.delete_many({"user_id": uid})


@pytest.fixture()
def client(connected_db):
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        uid=TEST_UID, email="test@example.com"
    )
    run_async(_seed_premium_user(TEST_UID))
    c = httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test")
    yield c
    run_async(c.aclose())
    run_async(_cleanup_user(TEST_UID))
    app.dependency_overrides.clear()


@pytest.fixture()
def unauth_client():
    c = httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test")
    yield c
    run_async(c.aclose())
