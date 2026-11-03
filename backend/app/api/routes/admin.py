"""Admin dashboard API routes."""
from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timezone, timedelta
from typing import List
from pydantic import BaseModel

from app.core.dependencies import get_current_admin, serialize_doc, get_db

router = APIRouter(prefix="/api/admin", tags=["Admin"])


class DashboardStats(BaseModel):
    total_users: int
    total_products: int
    total_tryon_requests: int
    successful_tryons: int
    failed_tryons: int
    pending_tryons: int
    new_users_last_7_days: int
    new_tryons_last_7_days: int


@router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard(
    db: AsyncIOMotorDatabase = Depends(get_db),
    _: dict = Depends(get_current_admin),
):
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)

    total_users = await db.users.count_documents({})
    total_products = await db.products.count_documents({})
    total_tryons = await db.tryon_history.count_documents({})
    successful = await db.tryon_history.count_documents({"status": "done"})
    failed = await db.tryon_history.count_documents({"status": "failed"})
    pending = await db.tryon_history.count_documents({"status": {"$in": ["queued", "processing"]}})
    new_users = await db.users.count_documents({"created_at": {"$gte": week_ago}})
    new_tryons = await db.tryon_history.count_documents({"created_at": {"$gte": week_ago}})

    return DashboardStats(
        total_users=total_users,
        total_products=total_products,
        total_tryon_requests=total_tryons,
        successful_tryons=successful,
        failed_tryons=failed,
        pending_tryons=pending,
        new_users_last_7_days=new_users,
        new_tryons_last_7_days=new_tryons,
    )


@router.get("/users")
async def list_users(
    db: AsyncIOMotorDatabase = Depends(get_db),
    _: dict = Depends(get_current_admin),
):
    users = await db.users.find({}, {"password_hash": 0}).to_list(500)
    return [serialize_doc(u) for u in users]
