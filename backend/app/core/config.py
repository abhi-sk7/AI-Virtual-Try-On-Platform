"""Application configuration using Pydantic Settings."""
from pydantic_settings import BaseSettings
from typing import List
from pathlib import Path
import os

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
STORAGE_BASE = PROJECT_ROOT / "storage"

class Settings(BaseSettings):
    # App
    APP_NAME: str = "AI Virtual Try-On Platform"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Security
    SECRET_KEY: str = "CHANGE_ME_IN_PRODUCTION_USE_STRONG_RANDOM_KEY_AT_LEAST_32_CHARS"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # MongoDB
    MONGODB_URL: str = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "virtual_tryon"

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]

    # Storage paths
    STORAGE_PATH: str = str(STORAGE_BASE)
    UPLOADS_PATH: str = str(STORAGE_BASE / "uploads")
    GENERATED_PATH: str = str(STORAGE_BASE / "generated")
    PRODUCTS_PATH: str = str(STORAGE_BASE / "products")
    MAX_UPLOAD_SIZE_MB: int = 10

    # AI Model
    AI_MODEL: str = "idm_vton"       # idm_vton | catvton | demo
    AI_MODEL_DEVICE: str = "cpu"     # cpu | cuda
    HUGGINGFACE_TOKEN: str = ""
    IDM_VTON_MODEL_ID: str = "yisol/IDM-VTON"

    # Rate limiting (requests per minute per IP)
    TRYON_RATE_LIMIT: int = 5

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
