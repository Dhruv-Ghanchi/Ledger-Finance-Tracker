"""Tests for DELETE /api/users/me — full account + data purge."""
import pytest
from datetime import datetime, timezone

from app.core.db import db
import app.users.routes as users_routes
from conftest import TEST_UID, run_async


@pytest.fixture(autouse=True)
def _no_real_firebase_delete(monkeypatch):
    """delete_account calls firebase_admin's delete_user; TEST_UID isn't a real
    Firebase user, so stub it out rather than hitting the live Firebase API."""
    calls = []
    monkeypatch.setattr(users_routes.firebase_auth, "delete_user", lambda uid: calls.append(uid))
    return calls


async def _seed_all_collections(uid=TEST_UID):
    now = datetime.now(timezone.utc).isoformat()
    await db.db.entries.insert_one({"id": "e1", "user_id": uid, "amount": 100, "created_at": now})
    await db.db.categories.insert_one({"id": "c1", "user_id": uid, "name": "Test", "type": "expense"})
    await db.db.debts.insert_one({"id": "d1", "user_id": uid, "amount": 50, "status": "pending"})
    await db.db.subscriptions.insert_one({"id": "s1", "user_id": uid, "status": "active", "razorpay_subscription_id": None})
    await db.db.payments.insert_one({"id": "p1", "user_id": uid, "amount": 999})


async def _cleanup_all(uid=TEST_UID):
    for collection in ("entries", "categories", "debts", "subscriptions", "payments"):
        await db.db[collection].delete_many({"user_id": uid})
    await db.db.users.delete_one({"firebase_uid": uid})


async def _count_all(uid=TEST_UID):
    return {
        "entries": await db.db.entries.count_documents({"user_id": uid}),
        "categories": await db.db.categories.count_documents({"user_id": uid}),
        "debts": await db.db.debts.count_documents({"user_id": uid}),
        "subscriptions": await db.db.subscriptions.count_documents({"user_id": uid}),
        "payments": await db.db.payments.count_documents({"user_id": uid}),
        "users": await db.db.users.count_documents({"firebase_uid": uid}),
    }


def test_delete_account_purges_every_collection(client, _no_real_firebase_delete):
    run_async(_seed_all_collections())
    try:
        counts_before = run_async(_count_all())
        assert all(v > 0 for v in counts_before.values()), f"seed didn't land: {counts_before}"

        resp = run_async(client.delete("/api/users/me"))
        assert resp.status_code == 200
        assert resp.json() == {"ok": True}

        counts_after = run_async(_count_all())
        assert all(v == 0 for v in counts_after.values()), f"leftover data: {counts_after}"
        assert _no_real_firebase_delete == [TEST_UID]
    finally:
        run_async(_cleanup_all())


def test_delete_account_requires_auth(unauth_client):
    resp = run_async(unauth_client.delete("/api/users/me"))
    assert resp.status_code == 401
