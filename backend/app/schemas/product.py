"""Pydantic schemas for Products and Categories."""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=50)
    description: Optional[str] = None
    parent: Optional[str] = None  # e.g. "upper_body"


class CategoryOut(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    parent: Optional[str] = None


class ProductCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    description: str = Field(..., min_length=10)
    category: str
    brand: str = ""
    price: float = Field(..., gt=0)
    colors: List[str] = []
    sizes: List[str] = []
    stock: int = Field(default=0, ge=0)
    garment_type: str = "upper_body"  # upper_body | lower_body | full_body | accessory
    tags: List[str] = []


class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=200)
    description: Optional[str] = None
    category: Optional[str] = None
    brand: Optional[str] = None
    price: Optional[float] = Field(None, gt=0)
    colors: Optional[List[str]] = None
    sizes: Optional[List[str]] = None
    stock: Optional[int] = Field(None, ge=0)
    garment_type: Optional[str] = None
    tags: Optional[List[str]] = None
    is_active: Optional[bool] = None


class ProductOut(BaseModel):
    id: str
    name: str
    description: str
    category: str
    brand: str
    price: float
    colors: List[str]
    sizes: List[str]
    stock: int
    garment_type: str
    images: List[str]
    tags: List[str]
    is_active: bool
    created_at: datetime


class ProductListResponse(BaseModel):
    items: List[ProductOut]
    total: int
    page: int
    page_size: int
    total_pages: int
