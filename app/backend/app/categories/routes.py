from fastapi import APIRouter, Depends, HTTPException
from typing import List
from pydantic import BaseModel, ConfigDict
import uuid
from app.auth.firebase import get_current_user, CurrentUser
from app.core.db import db

router = APIRouter(prefix="/api/categories", tags=["categories"])

class Category(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    name: str
    type: str
    is_preset: bool = False

class CategoryCreate(BaseModel):
    name: str
    type: str

@router.get("", response_model=List[Category])
async def list_categories(current_user: CurrentUser = Depends(get_current_user)):
    docs = await db.db.categories.find({"user_id": current_user.firebase_uid}, {"_id": 0}).to_list(1000)
    return [Category(**d) for d in docs]

@router.post("", response_model=Category)
async def add_category(body: CategoryCreate, current_user: CurrentUser = Depends(get_current_user)):
    existing = await db.db.categories.find_one({"user_id": current_user.firebase_uid, "name": body.name, "type": body.type})
    if existing:
        raise HTTPException(status_code=400, detail="Category already exists")
    
    cat = {
        "id": str(uuid.uuid4()),
        "user_id": current_user.firebase_uid,
        "name": body.name,
        "type": body.type,
        "is_preset": False
    }
    await db.db.categories.insert_one(cat.copy())
    return Category(**cat)

@router.delete("/{cat_id}")
async def delete_category(cat_id: str, current_user: CurrentUser = Depends(get_current_user)):
    doc = await db.db.categories.find_one({"id": cat_id, "user_id": current_user.firebase_uid}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    if doc.get("is_preset"):
        raise HTTPException(status_code=400, detail="Cannot delete preset category")
    await db.db.categories.delete_one({"id": cat_id, "user_id": current_user.firebase_uid})
    return {"ok": True}
