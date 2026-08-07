import asyncio
import uuid
from datetime import datetime, timezone

async def test():
    try:
        debt = {
            "_id": "dummy_oid",
            "id": str(uuid.uuid4()),
            "user_id": "test_user",
            "type": "to_collect",
            "person_name": "jai",
            "amount": 50.00,
            "note": None
        }
        
        now = datetime.now(timezone.utc).isoformat()
        
        entry_type = "expense" if debt["type"] == "to_pay" else "income"
        action = "Paid" if debt["type"] == "to_pay" else "Collected from"
        note = f"{action} {debt['person_name']} - {debt.get('note', '')}".strip()
        
        entry_date = datetime.now().strftime("%Y-%m-%d")
        
        entry = {
            "id": str(uuid.uuid4()),
            "user_id": "test_user",
            "date": entry_date,
            "amount": debt["amount"],
            "type": entry_type,
            "scope": "personal",
            "category": "Other",
            "note": note
        }
        
        debt["status"] = "settled"
        debt["settled_at"] = now
        debt.pop("_id", None)
        print("Success:", debt, entry)
    except Exception as e:
        print("Error:", repr(e))

asyncio.run(test())
