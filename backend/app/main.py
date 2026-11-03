"""FastAPI application entry point."""
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.database.connection import connect_to_mongo, close_mongo_connection
from app.api.routes.auth import router as auth_router
from app.api.routes.products import router as products_router, cat_router
from app.api.routes.tryon import router as tryon_router
from app.api.routes.favorites import fav_router, ward_router
from app.api.routes.admin import router as admin_router

# Configure logging
logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle."""
    # Ensure storage directories exist
    for path in [settings.UPLOADS_PATH, settings.GENERATED_PATH, settings.PRODUCTS_PATH]:
        os.makedirs(path, exist_ok=True)

    # Connect to MongoDB
    try:
        await connect_to_mongo()
    except Exception as e:
        logger.error(f"❌ MongoDB connection failed: {e}")
        logger.warning("Starting without MongoDB — database features will not work.")

    yield

    await close_mongo_connection()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI Virtual Try-On Platform — REST API",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure directories exist
for _p in [settings.UPLOADS_PATH, settings.GENERATED_PATH, settings.PRODUCTS_PATH]:
    os.makedirs(_p, exist_ok=True)

# Static file serving for uploaded/generated images
app.mount("/static/uploads", StaticFiles(directory=settings.UPLOADS_PATH), name="uploads")
app.mount("/static/generated", StaticFiles(directory=settings.GENERATED_PATH), name="generated")
app.mount("/static/products", StaticFiles(directory=settings.PRODUCTS_PATH), name="products")

# Include routers
app.include_router(auth_router)
app.include_router(products_router)
app.include_router(cat_router)
app.include_router(tryon_router)
app.include_router(fav_router)
app.include_router(ward_router)
app.include_router(admin_router)


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "ai_model": settings.AI_MODEL,
        "ai_device": settings.AI_MODEL_DEVICE,
    }


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error on {request.method} {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Please try again later."},
    )
