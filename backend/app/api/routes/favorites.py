"""Favorites and Wardrobe API routes."""
from fastapi import APIRouter, HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from datetime import datetime, timezone
from typing import List
from pydantic import BaseModel

from app.core.dependencies import get_current_user, serialize_doc, get_db

fav_router = APIRouter(prefix="/api/favorites", tags=["Favorites"])
ward_router = APIRouter(prefix="/api/wardrobe", tags=["Wardrobe"])


class FavoriteItem(BaseModel):
    id: str
    product_id: str
    product_name: str
    product_price: float
    product_images: List[str]
    created_at: datetime


class WardrobeItem(BaseModel):
    id: str
    product_id: str
    product_name: str
    generated_result_url: str
    note: str = ""
    created_at: datetime


# ── Favorites ────────────────────────────────────────────────────────────────

@fav_router.post("", status_code=201)
async def add_favorite(
    product_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    try:
        oid = ObjectId(product_id)
    except Exception:
        raise HTTPException(400, "Invalid product ID.")
    product = await db.products.find_one({"_id": oid})
    if not product:
        raise HTTPException(404, "Product not found.")

    existing = await db.favorites.find_one({
        "user_id": str(current_user["_id"]),
        "product_id": product_id,
    })
    if existing:
        raise HTTPException(409, "Already in favorites.")

    doc = {
        "user_id": str(current_user["_id"]),
        "product_id": product_id,
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.favorites.insert_one(doc)
    return {"id": str(result.inserted_id), "message": "Added to favorites."}


@fav_router.get("", response_model=List[FavoriteItem])
async def list_favorites(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    docs = await db.favorites.find({"user_id": str(current_user["_id"])}).to_list(200)
    result = []
    for d in docs:
        try:
            prod = await db.products.find_one({"_id": ObjectId(d["product_id"])})
        except Exception:
            prod = None
        if prod:
            result.append(FavoriteItem(
                id=str(d["_id"]),
                product_id=d["product_id"],
                product_name=prod["name"],
                product_price=prod["price"],
                product_images=prod.get("images", []),
                created_at=d["created_at"],
            ))
    return result


@fav_router.delete("/{favorite_id}", status_code=204)
async def remove_favorite(
    favorite_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    try:
        oid = ObjectId(favorite_id)
    except Exception:
        raise HTTPException(400, "Invalid ID.")
    result = await db.favorites.delete_one({
        "_id": oid,
        "user_id": str(current_user["_id"]),
    })
    if result.deleted_count == 0:
        raise HTTPException(404, "Favorite not found.")


# ── Wardrobe ─────────────────────────────────────────────────────────────────

@ward_router.post("", status_code=201)
async def save_to_wardrobe(
    product_id: str,
    generated_result_url: str,
    note: str = "",
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    try:
        oid = ObjectId(product_id)
    except Exception:
        raise HTTPException(400, "Invalid product ID.")
    product = await db.products.find_one({"_id": oid})
    if not product:
        raise HTTPException(404, "Product not found.")

    doc = {
        "user_id": str(current_user["_id"]),
        "product_id": product_id,
        "product_name": product["name"],
        "generated_result_url": generated_result_url,
        "note": note,
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.wardrobe.insert_one(doc)
    return {"id": str(result.inserted_id), "message": "Saved to wardrobe."}


@ward_router.get("", response_model=List[WardrobeItem])
async def list_wardrobe(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    docs = await db.wardrobe.find(
        {"user_id": str(current_user["_id"])}
    ).sort("created_at", -1).to_list(200)
    return [
        WardrobeItem(
            id=str(d["_id"]),
            product_id=d["product_id"],
            product_name=d["product_name"],
            generated_result_url=d["generated_result_url"],
            note=d.get("note", ""),
            created_at=d["created_at"],
        )
        for d in docs
    ]


@ward_router.delete("/{item_id}", status_code=204)
async def remove_from_wardrobe(
    item_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    try:
        oid = ObjectId(item_id)
    except Exception:
        raise HTTPException(400, "Invalid ID.")
    result = await db.wardrobe.delete_one({
        "_id": oid,
        "user_id": str(current_user["_id"]),
    })
    if result.deleted_count == 0:
        raise HTTPException(404, "Item not found.")
