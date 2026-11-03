"""Authentication API routes."""
from fastapi import APIRouter, HTTPException, status, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from datetime import datetime, timezone

from app.schemas.user import UserRegister, UserLogin, TokenResponse, UserOut, UserUpdate
from app.core.security import get_password_hash, verify_password, create_access_token
from app.core.dependencies import get_current_user, serialize_doc, get_db

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


def _build_user_out(user: dict) -> UserOut:
    doc = serialize_doc(user)
    return UserOut(
        id=doc["id"],
        name=doc["name"],
        email=doc["email"],
        role=doc.get("role", "user"),
        created_at=doc["created_at"],
    )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: UserRegister, db: AsyncIOMotorDatabase = Depends(get_db)):
    existing = await db.users.find_one({"email": payload.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered.")

    now = datetime.now(timezone.utc)
    user_doc = {
        "name": payload.name,
        "email": payload.email.lower(),
        "password_hash": get_password_hash(payload.password),
        "role": "user",
        "created_at": now,
        "measurements": {},
    }
    result = await db.users.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id

    token = create_access_token({"sub": str(result.inserted_id)})
    return TokenResponse(access_token=token, user=_build_user_out(user_doc))


@router.post("/login", response_model=TokenResponse)
async def login(payload: UserLogin, db: AsyncIOMotorDatabase = Depends(get_db)):
    user = await db.users.find_one({"email": payload.email.lower()})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = create_access_token({"sub": str(user["_id"])})
    return TokenResponse(access_token=token, user=_build_user_out(user))


@router.get("/me", response_model=UserOut)
async def get_me(current_user: dict = Depends(get_current_user)):
    return _build_user_out(current_user)


@router.put("/me", response_model=UserOut)
async def update_me(
    payload: UserUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    update_data = payload.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update.")

    # Separate measurements from top-level fields
    measurement_fields = {"height", "weight", "chest", "waist", "hip", "preferred_fit"}
    top_level = {k: v for k, v in update_data.items() if k not in measurement_fields}
    measurements = {k: v for k, v in update_data.items() if k in measurement_fields}

    mongo_update = {}
    if top_level:
        mongo_update.update(top_level)
    if measurements:
        for k, v in measurements.items():
            mongo_update[f"measurements.{k}"] = v

    await db.users.update_one(
        {"_id": current_user["_id"]},
        {"$set": mongo_update},
    )
    updated = await db.users.find_one({"_id": current_user["_id"]})
    return _build_user_out(updated)
