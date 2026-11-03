"""Products API routes — CRUD with image upload."""
from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File, Query, Form
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from datetime import datetime, timezone
from typing import List, Optional
import json, os, math

from app.schemas.product import ProductCreate, ProductUpdate, ProductOut, ProductListResponse, CategoryCreate, CategoryOut
from app.core.dependencies import get_current_user, get_current_admin, serialize_doc, get_db
from app.utils.image_utils import validate_image_file, process_uploaded_image, delete_file_if_exists
from app.core.config import settings

router = APIRouter(prefix="/api/products", tags=["Products"])
cat_router = APIRouter(prefix="/api/categories", tags=["Categories"])


def _product_out(doc: dict) -> ProductOut:
    d = serialize_doc(doc)
    return ProductOut(
        id=d["id"],
        name=d["name"],
        description=d["description"],
        category=d["category"],
        brand=d.get("brand", ""),
        price=d["price"],
        colors=d.get("colors", []),
        sizes=d.get("sizes", []),
        stock=d.get("stock", 0),
        garment_type=d.get("garment_type", "upper_body"),
        images=d.get("images", []),
        tags=d.get("tags", []),
        is_active=d.get("is_active", True),
        created_at=d["created_at"],
    )


# ── Categories ──────────────────────────────────────────────────────────────

@cat_router.get("", response_model=List[CategoryOut])
async def list_categories(db: AsyncIOMotorDatabase = Depends(get_db)):
    cats = await db.categories.find().to_list(200)
    return [CategoryOut(id=str(c["_id"]), name=c["name"], description=c.get("description"), parent=c.get("parent")) for c in cats]


@cat_router.post("", response_model=CategoryOut, status_code=201)
async def create_category(
    payload: CategoryCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    _: dict = Depends(get_current_admin),
):
    existing = await db.categories.find_one({"name": payload.name})
    if existing:
        raise HTTPException(400, "Category already exists.")
    doc = payload.model_dump()
    doc["created_at"] = datetime.now(timezone.utc)
    result = await db.categories.insert_one(doc)
    doc["_id"] = result.inserted_id
    return CategoryOut(id=str(result.inserted_id), **payload.model_dump())


# ── Products ─────────────────────────────────────────────────────────────────

@router.get("", response_model=ProductListResponse)
async def list_products(
    db: AsyncIOMotorDatabase = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=50),
    category: Optional[str] = None,
    search: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    color: Optional[str] = None,
    size: Optional[str] = None,
    sort_by: Optional[str] = "created_at",
    sort_order: Optional[str] = "desc",
):
    query: dict = {"is_active": True}
    if category:
        query["category"] = category
    if search:
        query["$text"] = {"$search": search}
    if min_price is not None or max_price is not None:
        price_filter = {}
        if min_price is not None:
            price_filter["$gte"] = min_price
        if max_price is not None:
            price_filter["$lte"] = max_price
        query["price"] = price_filter
    if color:
        query["colors"] = {"$in": [color]}
    if size:
        query["sizes"] = {"$in": [size]}

    sort_direction = -1 if sort_order == "desc" else 1
    valid_sort = {"created_at", "price", "name"}
    if sort_by not in valid_sort:
        sort_by = "created_at"

    total = await db.products.count_documents(query)
    skip = (page - 1) * page_size
    cursor = db.products.find(query).sort(sort_by, sort_direction).skip(skip).limit(page_size)
    docs = await cursor.to_list(page_size)

    return ProductListResponse(
        items=[_product_out(d) for d in docs],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total else 0,
    )


@router.get("/{product_id}", response_model=ProductOut)
async def get_product(product_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    try:
        oid = ObjectId(product_id)
    except Exception:
        raise HTTPException(400, "Invalid product ID.")
    doc = await db.products.find_one({"_id": oid})
    if not doc:
        raise HTTPException(404, "Product not found.")
    return _product_out(doc)


@router.post("", response_model=ProductOut, status_code=201)
async def create_product(
    payload: ProductCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    _: dict = Depends(get_current_admin),
):
    doc = payload.model_dump()
    doc["images"] = []
    doc["is_active"] = True
    doc["created_at"] = datetime.now(timezone.utc)
    result = await db.products.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _product_out(doc)


@router.put("/{product_id}", response_model=ProductOut)
async def update_product(
    product_id: str,
    payload: ProductUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    _: dict = Depends(get_current_admin),
):
    try:
        oid = ObjectId(product_id)
    except Exception:
        raise HTTPException(400, "Invalid product ID.")
    update_data = payload.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(400, "No fields to update.")
    result = await db.products.update_one({"_id": oid}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(404, "Product not found.")
    doc = await db.products.find_one({"_id": oid})
    return _product_out(doc)


@router.delete("/{product_id}", status_code=204)
async def delete_product(
    product_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    _: dict = Depends(get_current_admin),
):
    try:
        oid = ObjectId(product_id)
    except Exception:
        raise HTTPException(400, "Invalid product ID.")
    result = await db.products.delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(404, "Product not found.")


@router.post("/{product_id}/images", response_model=ProductOut)
async def upload_product_image(
    product_id: str,
    file: UploadFile = File(...),
    db: AsyncIOMotorDatabase = Depends(get_db),
    _: dict = Depends(get_current_admin),
):
    try:
        oid = ObjectId(product_id)
    except Exception:
        raise HTTPException(400, "Invalid product ID.")

    data = await file.read()
    valid, err = validate_image_file(file.filename, file.content_type, len(data))
    if not valid:
        raise HTTPException(400, err)

    filename, _ = process_uploaded_image(data, settings.PRODUCTS_PATH, prefix="prod")
    image_url = f"/static/products/{filename}"

    await db.products.update_one({"_id": oid}, {"$push": {"images": image_url}})
    doc = await db.products.find_one({"_id": oid})
    return _product_out(doc)
