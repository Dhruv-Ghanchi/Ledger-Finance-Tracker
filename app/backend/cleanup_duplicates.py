"""
One-time script to remove duplicate ledger entries from MongoDB Atlas.
Keeps the OLDEST entry (lowest created_at) for each (user_id, date, amount, note) group.
Run from: D:/expense tracker/app/backend/
  python cleanup_duplicates.py
"""
import asyncio
import os, sys
from pathlib import Path
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

# Load .env from the backend root
load_dotenv(Path(__file__).parent / ".env")

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME   = os.environ.get("DB_NAME", "finance_tracker")

async def remove_duplicates():
    print(f"Connecting to: {MONGO_URL[:40]}...")
    client = AsyncIOMotorClient(MONGO_URL)
    coll   = client[DB_NAME]["entries"]

    total_docs = await coll.count_documents({})
    print(f"Total documents before cleanup: {total_docs}\n")

    # Group by fingerprint; collect all ids per group, keep oldest
    pipeline = [
        {"$sort": {"created_at": 1}},               # oldest first
        {"$group": {
            "_id": {
                "user_id": "$user_id",
                "date":    "$date",
                "amount":  "$amount",
                "note":    "$note",
            },
            "keep":    {"$first": "$id"},            # keep oldest doc
            "all_ids": {"$push":  "$id"},
            "count":   {"$sum": 1},
        }},
        {"$match": {"count": {"$gt": 1}}},           # only groups with dupes
    ]

    cursor = coll.aggregate(pipeline)
    total_removed = 0

    async for group in cursor:
        keep  = group["keep"]
        dupes = [i for i in group["all_ids"] if i != keep]
        result = await coll.delete_many({"id": {"$in": dupes}})
        total_removed += result.deleted_count
        note_preview = str(group["_id"]["note"] or "")[:45]
        print(f"  - Removed {result.deleted_count} dup(s) | kept id={keep[:8]}... "
              f"| {group['_id']['date']} | Rs{group['_id']['amount']} | {note_preview}")

    total_after = await coll.count_documents({})
    print(f"\nDone -- {total_removed} duplicate(s) deleted. "
          f"Documents remaining: {total_after}")
    client.close()

if __name__ == "__main__":
    asyncio.run(remove_duplicates())
