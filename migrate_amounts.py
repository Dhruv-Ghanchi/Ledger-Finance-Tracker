#!/usr/bin/env python3
"""
Migration script to convert float amounts to integers (paise) in the entries collection.
Run this script once to migrate existing data.
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "ledger_saas")

async def migrate():
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DB_NAME]
    
    print(f"Connecting to {MONGO_URI}/{DB_NAME}...")
    
    # Find all entries with float amount
    cursor = db.entries.find({"amount": {"$type": "double"}})
    entries = await cursor.to_list(length=None)
    
    print(f"Found {len(entries)} entries to migrate")
    
    migrated = 0
    for entry in entries:
        old_amount = entry["amount"]
        # Convert to paise (multiply by 100 and round)
        new_amount = int(round(old_amount * 100))
        
        await db.entries.update_one(
            {"id": entry["id"]},
            {"$set": {"amount": new_amount}}
        )
        migrated += 1
        
        if migrated % 100 == 0:
            print(f"Migrated {migrated} entries...")
    
    print(f"Migration complete! Migrated {migrated} entries.")
    
    # Verify
    cursor = db.entries.find({"amount": {"$type": "double"}})
    remaining = await cursor.to_list(length=None)
    print(f"Remaining float entries: {len(remaining)}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(migrate())