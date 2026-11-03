"""Virtual Try-On API routes — async job-based processing."""
from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File, Form, BackgroundTasks
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from datetime import datetime, timezone
from typing import List, Optional
import uuid, os, time

from app.schemas.tryon import TryOnJobResponse, TryOnHistoryItem, SizeRecommendationRequest, SizeRecommendationResponse
from app.core.dependencies import get_current_user, serialize_doc, get_db
from app.utils.image_utils import validate_image_file, process_uploaded_image
from app.ai.tryon_service import get_service_instance
from app.core.config import settings

router = APIRouter(prefix="/api/tryon", tags=["Virtual Try-On"])


def _build_job_response(doc: dict) -> TryOnJobResponse:
    d = serialize_doc(doc)
    return TryOnJobResponse(
        job_id=d["job_id"],
        status=d["status"],
        message=d.get("message", ""),
        original_image_url=d.get("original_image_url"),
        generated_image_url=d.get("generated_image_url"),
        product_id=d.get("product_id"),
        created_at=d["created_at"],
        completed_at=d.get("completed_at"),
        processing_time_seconds=d.get("processing_time_seconds"),
    )


async def _run_inference_job(job_id: str, person_path: str, garment_path: str, garment_type: str):
    """Background task: run AI inference and update job status in DB."""
    from app.database.connection import get_db as _get_db
    db = _get_db()
    start = time.time()

    await db.tryon_history.update_one(
        {"job_id": job_id},
        {"$set": {"status": "processing"}},
    )

    service = get_service_instance()
    output_filename = f"result_{job_id}.jpg"
    output_path = os.path.join(settings.GENERATED_PATH, output_filename)
    os.makedirs(settings.GENERATED_PATH, exist_ok=True)

    success, error = await service.run_tryon(person_path, garment_path, garment_type, output_path)
    elapsed = time.time() - start

    if success:
        generated_url = f"/static/generated/{output_filename}"
        await db.tryon_history.update_one(
            {"job_id": job_id},
            {"$set": {
                "status": "done",
                "generated_image_url": generated_url,
                "completed_at": datetime.now(timezone.utc),
                "processing_time_seconds": elapsed,
                "message": "Try-on completed successfully.",
            }},
        )
    else:
        final_status = "unavailable" if "unavailable" in error.lower() or "cuda" in error.lower() else "failed"
        await db.tryon_history.update_one(
            {"job_id": job_id},
            {"$set": {
                "status": final_status,
                "message": error,
                "completed_at": datetime.now(timezone.utc),
                "processing_time_seconds": elapsed,
            }},
        )


@router.post("/photo", response_model=TryOnJobResponse, status_code=202)
async def submit_tryon(
    background_tasks: BackgroundTasks,
    person_image: UploadFile = File(..., description="Full-body or upper-body photo of the person"),
    product_id: str = Form(...),
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    # Validate product exists
    try:
        prod_oid = ObjectId(product_id)
    except Exception:
        raise HTTPException(400, "Invalid product ID.")
    product = await db.products.find_one({"_id": prod_oid})
    if not product:
        raise HTTPException(404, "Product not found.")

    # Validate person image
    data = await person_image.read()
    valid, err = validate_image_file(person_image.filename, person_image.content_type, len(data))
    if not valid:
        raise HTTPException(400, err)

    # Save person image
    filename, person_path = process_uploaded_image(data, settings.UPLOADS_PATH, prefix="person")
    person_url = f"/static/uploads/{filename}"

    # Get garment image (first product image)
    garment_images = product.get("images", [])
    if not garment_images:
        raise HTTPException(400, "Product has no images. Cannot perform try-on.")
    # Convert URL back to path
    garment_filename = garment_images[0].split("/")[-1]
    garment_path = os.path.join(settings.PRODUCTS_PATH, garment_filename)
    if not os.path.exists(garment_path):
        raise HTTPException(400, "Product garment image not found on server.")

    # Create job record
    job_id = uuid.uuid4().hex
    now = datetime.now(timezone.utc)
    job_doc = {
        "job_id": job_id,
        "user_id": str(current_user["_id"]),
        "product_id": product_id,
        "product_name": product["name"],
        "garment_type": product.get("garment_type", "upper_body"),
        "original_image_url": person_url,
        "original_image_path": person_path,
        "garment_image_path": garment_path,
        "generated_image_url": None,
        "status": "queued",
        "message": "Job queued. Processing will start shortly.",
        "created_at": now,
        "completed_at": None,
        "processing_time_seconds": None,
    }
    await db.tryon_history.insert_one(job_doc)

    # Queue background inference
    background_tasks.add_task(
        _run_inference_job,
        job_id,
        person_path,
        garment_path,
        product.get("garment_type", "upper_body"),
    )

    return _build_job_response(job_doc)


@router.get("/status/{job_id}", response_model=TryOnJobResponse)
async def get_job_status(
    job_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    doc = await db.tryon_history.find_one({
        "job_id": job_id,
        "user_id": str(current_user["_id"]),
    })
    if not doc:
        raise HTTPException(404, "Job not found.")
    return _build_job_response(doc)


@router.get("/history", response_model=List[TryOnHistoryItem])
async def get_history(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    docs = await db.tryon_history.find(
        {"user_id": str(current_user["_id"])}
    ).sort("created_at", -1).limit(50).to_list(50)

    return [
        TryOnHistoryItem(
            id=str(d["_id"]),
            job_id=d["job_id"],
            product_id=d["product_id"],
            product_name=d.get("product_name", ""),
            original_image_url=d["original_image_url"],
            generated_image_url=d.get("generated_image_url"),
            status=d["status"],
            created_at=d["created_at"],
        )
        for d in docs
    ]


@router.post("/size-recommend", response_model=SizeRecommendationResponse)
async def recommend_size(
    payload: SizeRecommendationRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Rule-based size recommendation using standard international sizing charts."""
    try:
        prod_oid = ObjectId(payload.product_id)
    except Exception:
        raise HTTPException(400, "Invalid product ID.")
    product = await db.products.find_one({"_id": prod_oid})
    if not product:
        raise HTTPException(404, "Product not found.")

    # Simple rule-based size estimation
    chest = payload.chest
    waist = payload.waist
    garment_type = product.get("garment_type", "upper_body")
    available_sizes = product.get("sizes", ["XS", "S", "M", "L", "XL", "XXL"])

    # Chest-based sizing for upper body
    size_chart = {
        "XS": (76, 84),
        "S": (84, 92),
        "M": (92, 100),
        "L": (100, 108),
        "XL": (108, 116),
        "XXL": (116, 124),
    }

    recommended = "M"
    confidence = "low"

    if garment_type in ("upper_body", "full_body") and chest:
        for size, (low, high) in size_chart.items():
            if low <= chest < high:
                recommended = size
                confidence = "high"
                break
    elif garment_type == "lower_body" and waist:
        waist_chart = {
            "XS": (58, 66), "S": (66, 74), "M": (74, 82),
            "L": (82, 90), "XL": (90, 98), "XXL": (98, 106),
        }
        for size, (low, high) in waist_chart.items():
            if low <= waist < high:
                recommended = size
                confidence = "high"
                break
    else:
        # BMI-based rough estimate
        bmi = payload.weight / ((payload.height / 100) ** 2)
        if bmi < 18.5:
            recommended = "S"
        elif bmi < 25:
            recommended = "M"
        elif bmi < 30:
            recommended = "L"
        else:
            recommended = "XL"
        confidence = "low"

    # Adjust for preferred fit
    all_sizes = ["XS", "S", "M", "L", "XL", "XXL"]
    idx = all_sizes.index(recommended) if recommended in all_sizes else 2
    if payload.preferred_fit == "relaxed" and idx < len(all_sizes) - 1:
        recommended = all_sizes[idx + 1]
    elif payload.preferred_fit == "slim" and idx > 0:
        recommended = all_sizes[idx - 1]

    if recommended not in available_sizes:
        recommended = available_sizes[len(available_sizes) // 2] if available_sizes else "M"
        confidence = "low"

    return SizeRecommendationResponse(
        recommended_size=recommended,
        confidence=confidence,
        size_chart={s: f"{v[0]}-{v[1]} cm chest" for s, v in size_chart.items()},
    )
