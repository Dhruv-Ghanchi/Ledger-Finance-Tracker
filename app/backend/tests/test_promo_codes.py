"""Tests for capacity-limited promo code redemption (apply_promo_code).

Covers the "advertise N, honor exactly N" launch-promo mechanism: redemptions
must stop dead at max_redemptions, and anyone after the cap gets an honest
"exhausted" status rather than silently succeeding or looking like an invalid code.
"""
from datetime import datetime, timezone

from conftest import run_async
from app.core.db import db
from app.users.routes import apply_promo_code

TEST_CODE = "TESTCAP3"


async def _seed_capped_code(max_redemptions=3):
    await db.db.promo_codes.delete_one({"code": TEST_CODE})
    await db.db.promo_codes.insert_one({
        "code": TEST_CODE, "plan": "lifetimefree", "days": None, "active": True,
        "max_redemptions": max_redemptions, "redeemed_count": 0,
    })


async def _cleanup():
    await db.db.promo_codes.delete_one({"code": TEST_CODE})


def test_capacity_limited_promo_stops_exactly_at_cap(connected_db):
    run_async(_seed_capped_code(max_redemptions=3))
    try:
        now = datetime.now(timezone.utc)
        statuses = []
        for _ in range(5):
            user = {"promo_used": False}
            _, status = run_async(apply_promo_code(user, TEST_CODE, now))
            statuses.append(status)

        assert statuses == ["applied", "applied", "applied", "exhausted", "exhausted"]

        doc = run_async(db.db.promo_codes.find_one({"code": TEST_CODE}))
        assert doc["redeemed_count"] == 3
    finally:
        run_async(_cleanup())


def test_already_used_promo_short_circuits(connected_db):
    run_async(_seed_capped_code(max_redemptions=3))
    try:
        now = datetime.now(timezone.utc)
        user = {"promo_used": True}
        update, status = run_async(apply_promo_code(user, TEST_CODE, now))
        assert status == "already_used"
        assert update == {}

        doc = run_async(db.db.promo_codes.find_one({"code": TEST_CODE}))
        assert doc["redeemed_count"] == 0, "a rejected redemption must not consume a slot"
    finally:
        run_async(_cleanup())


def test_invalid_promo_code(connected_db):
    now = datetime.now(timezone.utc)
    user = {"promo_used": False}
    update, status = run_async(apply_promo_code(user, "NOPE_NOT_REAL_CODE", now))
    assert status == "invalid"
    assert update == {}


def test_uncapped_promo_has_no_limit(connected_db):
    """Codes without max_redemptions (e.g. LIFETIMEFREE) are unaffected by the cap logic."""
    run_async(db.db.promo_codes.delete_one({"code": "UNCAPPEDTEST"}))
    run_async(db.db.promo_codes.insert_one(
        {"code": "UNCAPPEDTEST", "plan": "monthly", "days": 30, "active": True}
    ))
    try:
        now = datetime.now(timezone.utc)
        for _ in range(5):
            user = {"promo_used": False}
            _, status = run_async(apply_promo_code(user, "UNCAPPEDTEST", now))
            assert status == "applied"
    finally:
        run_async(db.db.promo_codes.delete_one({"code": "UNCAPPEDTEST"}))
