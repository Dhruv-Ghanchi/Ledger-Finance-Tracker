import os
import sys
import asyncio
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent.parent
sys.path.append(str(ROOT_DIR))

from app.core.db import db
from app.core.config import settings

async def migrate(default_user_id: str):
    print("Connecting to DB...")
    db.connect()
    
    # Check if entries need migration
    print("Migrating entries...")
    res = await db.db.entries.update_many(
        {"user_id": {"$exists": False}},
        {"$set": {"user_id": default_user_id}}
    )
    print(f"Updated {res.modified_count} entries.")
    
    # Check if categories need migration
    print("Migrating categories...")
    res = await db.db.categories.update_many(
        {"user_id": {"$exists": False}},
        {"$set": {"user_id": default_user_id}}
    )
    print(f"Updated {res.modified_count} categories.")
    
    print("Migration complete.")
    db.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python migrate_tenant.py <firebase_uid>")
        sys.exit(1)
        
    uid = sys.argv[1]
    asyncio.run(migrate(uid))
