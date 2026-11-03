"""Pydantic schemas for User."""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Literal
from datetime import datetime


class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    name: str
    email: str
    role: str
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    height: Optional[float] = None    # cm
    weight: Optional[float] = None    # kg
    chest: Optional[float] = None     # cm
    waist: Optional[float] = None     # cm
    hip: Optional[float] = None       # cm
    preferred_fit: Optional[Literal["slim", "regular", "relaxed"]] = None
