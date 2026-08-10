import argparse
import asyncio
from datetime import datetime, timedelta, timezone

from app.core.db import db
from app.users.routes import purge_and_delete_user

INACTIVITY_DAYS = 90  # 3 months


async def _find_inactive_uids(cutoff_iso: str) -> list[str]:
    cursor = db.db.users.find(
        {
            "$or": [
                {"last_active": {"$ne": None, "$lt": cutoff_iso}},
                {"last_active": None, "created_at": {"$lt": cutoff_iso}},
            ]
        },
        {"_id": 0, "firebase_uid": 1, "email": 1, "plan": 1},
    )
    return await cursor.to_list(10000)


async def run(confirm: bool):
    """Find users inactive for 90+ days and permanently delete their account
    and all data — same purge routine as the self-service DELETE /users/me.

    Applies to every plan, including paid and lifetime, exactly as requested:
    there is no carve-out for active subscriptions. Run manually or on a
    schedule (e.g. a Render Cron Job — there's no in-process scheduler for
    this, unlike expire.py's trial check, since deletion is irreversible and
    shouldn't fire silently inside the main API process).

    Defaults to a dry run that only lists affected users. Pass --confirm to
    actually delete them.
    """
    db.connect()
    cutoff = (datetime.now(timezone.utc) - timedelta(days=INACTIVITY_DAYS)).isoformat()
    inactive = await _find_inactive_uids(cutoff)

    if not inactive:
        print("No inactive users found.")
        db.close()
        return

    print(f"{len(inactive)} user(s) inactive for {INACTIVITY_DAYS}+ days:")
    for u in inactive:
        print(f"  - {u.get('email')} (plan={u.get('plan')}, uid={u['firebase_uid']})")

    if not confirm:
        print("\nDry run only — no data was deleted. Re-run with --confirm to actually delete these accounts.")
        db.close()
        return

    deleted, failed = 0, 0
    for u in inactive:
        try:
            await purge_and_delete_user(u["firebase_uid"])
            deleted += 1
        except Exception as e:
            failed += 1
            print(f"  ! Failed to delete {u.get('email')} ({u['firebase_uid']}): {e}")

    print(f"\nDeleted {deleted} inactive account(s). {failed} failed.")
    db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--confirm", action="store_true", help="Actually delete the accounts found (default is a dry run).")
    args = parser.parse_args()
    asyncio.run(run(confirm=args.confirm))
