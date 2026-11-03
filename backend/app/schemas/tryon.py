"""Pydantic schemas for Virtual Try-On operations."""
from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime


class TryOnJobResponse(BaseModel):
    job_id: str
    status: Literal["queued", "processing", "done", "failed", "unavailable"]
    message: str = ""
    original_image_url: Optional[str] = None
    generated_image_url: Optional[str] = None
    product_id: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    processing_time_seconds: Optional[float] = None


class TryOnHistoryItem(BaseModel):
    id: str
    job_id: str
    product_id: str
    product_name: str
    original_image_url: str
    generated_image_url: Optional[str] = None
    status: str
    created_at: datetime


class SizeRecommendationRequest(BaseModel):
    height: float = Field(..., gt=0, description="Height in cm")
    weight: float = Field(..., gt=0, description="Weight in kg")
    chest: Optional[float] = Field(None, gt=0, description="Chest circumference in cm")
    waist: Optional[float] = Field(None, gt=0, description="Waist circumference in cm")
    hip: Optional[float] = Field(None, gt=0, description="Hip circumference in cm")
    preferred_fit: Literal["slim", "regular", "relaxed"] = "regular"
    product_id: str


class SizeRecommendationResponse(BaseModel):
    recommended_size: str
    confidence: str  # high | medium | low
    disclaimer: str = (
        "Size recommendations are estimates based on provided measurements. "
        "Actual fit may vary by brand and garment cut. Try before purchase when possible."
    )
    size_chart: dict = {}
