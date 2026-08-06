import asyncio
from datetime import datetime, timezone

from app.core.db import db


async def run():
    """Expire trials that have genuinely passed their trial_end.

    Only users whose trial_end is in the past are moved to the free plan.
    Active trials, paid subscriptions, and lifetime plans are never touched.
    Run manually or on a schedule — it is safe to re-run.
    """
    db.connect()
    now = datetime.now(timezone.utc)
    result = await db.db.users.update_many(
        {"plan": "trial", "trial_end": {"$ne": None, "$lt": now.isoformat()}},
        {
            "$set": {
                "plan": "free",
                "subscription_status": "free",
                "subscription_expiry": None,
                "updated_at": now.isoformat(),
            }
        },
    )
    print(f"Expired {result.modified_count} trial(s) whose trial_end has passed.")
    db.close()


if __name__ == "__main__":
    asyncio.run(run())
