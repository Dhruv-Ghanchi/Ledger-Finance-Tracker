import asyncio
from app.core.db import db
from app.subscriptions.checker import has_premium_access, _parse_utc
import datetime

db.connect()

async def main():
    cursor = db.db.users.find({})
    async for u in cursor:
        access = await has_premium_access(u['firebase_uid'])
        print(f"User {u.get('email')}: plan={u.get('plan')} trial_end={u.get('trial_end')} -> access={access}")
        if u.get('trial_end'):
            parsed = _parse_utc(u.get('trial_end'))
            now = datetime.datetime.now(datetime.timezone.utc)
            print(f"  now={now} < parsed={parsed} is {now < parsed}")
    db.close()

asyncio.run(main())
