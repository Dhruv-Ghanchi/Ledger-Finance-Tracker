"""
Find the Dev Tester user_id and delete ALL their entries from MongoDB.
Run from: D:/expense tracker/app/backend/
  python wipe_dev_tester.py
"""
import asyncio
import os
from pathlib import Path
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(Path(__file__).parent / ".env")

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME   = os.environ.get("DB_NAME", "finance_tracker")

async def wipe():
    print(f"Connecting...")
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    # Find users named "Dev Tester"
    users_coll = db["users"]
    entries_coll = db["entries"]

    # Print all users so we can confirm
    print("\n--- All users in DB ---")
    async for user in users_coll.find({}, {"_id": 0, "uid": 1, "firebase_uid": 1, "name": 1, "email": 1, "display_name": 1}):
        print(user)

    # Find Dev Tester specifically
    dev_user = await users_coll.find_one({
        "$or": [
            {"name": {"$regex": "dev tester", "$options": "i"}},
            {"display_name": {"$regex": "dev tester", "$options": "i"}},
            {"email": {"$regex": "dev", "$options": "i"}},
        ]
    })

    if not dev_user:
        print("\nNo user matching 'Dev Tester' found. Listing all entry user_ids...")
        async for e in entries_coll.find({}, {"_id": 0, "user_id": 1, "note": 1, "date": 1}):
            print(e)
        client.close()
        return

    # Get their uid / firebase_uid
    uid = dev_user.get("firebase_uid") or dev_user.get("uid") or dev_user.get("_id")
    print(f"\nFound Dev Tester: uid={uid}  doc={dev_user}")

    count_before = await entries_coll.count_documents({"user_id": uid})
    print(f"Entries to delete: {count_before}")

    if count_before == 0:
        print("Nothing to delete.")
        client.close()
        return

    result = await entries_coll.delete_many({"user_id": uid})
    print(f"\nDeleted {result.deleted_count} entries for Dev Tester (uid={uid})")

    count_after = await entries_coll.count_documents({})
    print(f"Total entries remaining in DB: {count_after}")
    client.close()

if __name__ == "__main__":
    asyncio.run(wipe())
