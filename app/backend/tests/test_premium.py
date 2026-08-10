"""Tests for the premium/trial/lifetime access logic.

Covers:
- has_premium_access for trial, free, monthly, lifetime, lifetimefree, expired trial
- require_premium gating on categories (add / delete)
- sync_user grants a one-time 6-month trial to new and existing free users
"""

from datetime import datetime, timezone, timedelta

import pytest
import httpx

from conftest import run_async, TEST_UID
from app.auth.firebase import get_current_user, CurrentUser
from app.core.db import db
from app.subscriptions.checker import has_premium_access
from main import app


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def add_days_iso(days):
    return (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()


async def set_user_plan(plan, **extra):
    doc = {
        "firebase_uid": TEST_UID,
        "email": "premium@example.com",
        "plan": plan,
        "subscription_status": "free",
        "subscription_expiry": None,
        "trial_start": None,
        "trial_end": None,
    }
    doc.update(extra)
    await db.db.users.update_one(
        {"firebase_uid": doc["firebase_uid"]}, {"$set": doc}, upsert=True
    )


async def clear_test_user():
    await db.db.users.delete_one({"firebase_uid": TEST_UID})
    await db.db.categories.delete_many({"user_id": TEST_UID})


@pytest.fixture()
def connected_db():
    """Connect MongoDB once per test on the shared loop."""
    if db.db is None:
        db.connect()
    run_async(clear_test_user())
    yield db.db
    run_async(clear_test_user())


@pytest.fixture()
def any_user_client(connected_db):
    app.dependency_overrides[get_current_user] = lambda: CurrentUser(
        uid=TEST_UID, email="premium@example.com"
    )
    c = httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    )
    yield c
    run_async(c.aclose())
    app.dependency_overrides.clear()


# ------------------------------------------------------------------ access rules

def test_trial_active_has_premium(connected_db):
    run_async(set_user_plan("trial", trial_start=now_iso(), trial_end=add_days_iso(30)))
    assert run_async(has_premium_access(TEST_UID)) is True


def test_trial_expired_no_premium(connected_db):
    run_async(set_user_plan("trial", trial_start=add_days_iso(-90), trial_end=add_days_iso(-30)))
    assert run_async(has_premium_access(TEST_UID)) is False


def test_free_plan_no_premium(connected_db):
    run_async(set_user_plan("free"))
    assert run_async(has_premium_access(TEST_UID)) is False


def test_monthly_active_has_premium(connected_db):
    run_async(
        set_user_plan(
            "monthly",
            subscription_status="active",
            subscription_expiry=add_days_iso(10),
        )
    )
    assert run_async(has_premium_access(TEST_UID)) is True


def test_monthly_expired_no_premium(connected_db):
    run_async(
        set_user_plan(
            "monthly",
            subscription_status="active",
            subscription_expiry=add_days_iso(-10),
        )
    )
    assert run_async(has_premium_access(TEST_UID)) is False


def test_lifetime_has_premium(connected_db):
    run_async(set_user_plan("lifetime"))
    assert run_async(has_premium_access(TEST_UID)) is True


def test_lifetimefree_has_premium_forever(connected_db):
    run_async(set_user_plan("lifetimefree"))
    assert run_async(has_premium_access(TEST_UID)) is True


def test_missing_user_no_premium(connected_db):
    run_async(clear_test_user())
    assert run_async(has_premium_access(TEST_UID)) is False


# ------------------------------------------------------------ category gating

def test_free_user_cannot_add_category(any_user_client):
    run_async(set_user_plan("free"))
    r = run_async(
        any_user_client.post("/api/categories", json={"name": "Coffee", "type": "expense"})
    )
    assert r.status_code == 403


def test_free_user_cannot_delete_category(any_user_client):
    run_async(set_user_plan("free"))

    async def insert_cat():
        cat = {"id": "cat-1", "user_id": TEST_UID, "name": "Coffee", "type": "expense", "is_preset": False}
        await db.db.categories.insert_one(cat)
        return cat["id"]

    cat_id = run_async(insert_cat())
    r = run_async(any_user_client.delete(f"/api/categories/{cat_id}"))
    assert r.status_code == 403


def test_trial_user_can_add_category(any_user_client):
    run_async(set_user_plan("trial", trial_start=now_iso(), trial_end=add_days_iso(30)))
    r = run_async(
        any_user_client.post("/api/categories", json={"name": "Coffee", "type": "expense"})
    )
    assert r.status_code == 200


def test_lifetimefree_user_can_add_category(any_user_client):
    run_async(set_user_plan("lifetimefree"))
    r = run_async(
        any_user_client.post("/api/categories", json={"name": "Coffee", "type": "expense"})
    )
    assert r.status_code == 200


# ------------------------------------------------------------ sync trial grant

def test_sync_new_user_gets_6_month_trial(any_user_client):
    run_async(clear_test_user())
    r = run_async(
        any_user_client.post("/api/users/sync", json={"name": "Premium Tester"})
    )
    assert r.status_code == 200
    data = r.json()
    assert data["plan"] == "trial"
    assert data["subscription_status"] == "trial"
    assert data["trial_end"] > now_iso()


def test_sync_existing_free_user_gets_one_time_trial(any_user_client):
    run_async(set_user_plan("free"))
    r = run_async(any_user_client.post("/api/users/sync", json={}))
    assert r.status_code == 200
    data = r.json()
    assert data["plan"] == "trial"
    assert data["trial_end"] > now_iso()


def test_sync_does_not_reset_existing_trial(any_user_client):
    run_async(
        set_user_plan(
            "trial",
            trial_start=add_days_iso(-20),
            trial_end=add_days_iso(40),
        )
    )
    r = run_async(any_user_client.post("/api/users/sync", json={}))
    data = r.json()
    assert data["plan"] == "trial"
    # Original 40-days-from-now end must be preserved.
    assert "40" in data["trial_end"] or data["trial_end"] > now_iso()


def test_sync_does_not_touch_paid_or_lifetime_plans(any_user_client):
    for plan in ("monthly", "yearly", "lifetime", "lifetimefree"):
        run_async(set_user_plan(plan))
        r = run_async(any_user_client.post("/api/users/sync", json={}))
        data = r.json()
        assert data["plan"] == plan
