"""Image validation and processing utilities."""
import os
import uuid
import logging
from pathlib import Path
from typing import Tuple, Optional
from PIL import Image
import io

from app.core.config import settings

logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_IMAGE_DIMENSION = 2048
MIN_IMAGE_DIMENSION = 64


def validate_image_file(filename: str, content_type: str, size_bytes: int) -> Tuple[bool, str]:
    """Validate uploaded image file. Returns (is_valid, error_message)."""
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        return False, f"Unsupported file type '{ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"

    allowed_content_types = {"image/jpeg", "image/png", "image/webp"}
    if content_type not in allowed_content_types:
        return False, f"Invalid content type: {content_type}"

    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if size_bytes > max_bytes:
        return False, f"File too large. Maximum size is {settings.MAX_UPLOAD_SIZE_MB} MB."

    return True, ""


def process_uploaded_image(data: bytes, save_dir: str, prefix: str = "img") -> Tuple[str, str]:
    """
    Validate, resize if needed, and save an uploaded image.
    Returns (filename, full_path).
    """
    # Open and validate
    img = Image.open(io.BytesIO(data))
    if img.mode not in ("RGB", "RGBA", "L"):
        img = img.convert("RGB")
    elif img.mode == "RGBA":
        img = img.convert("RGB")

    w, h = img.size
    if w < MIN_IMAGE_DIMENSION or h < MIN_IMAGE_DIMENSION:
        raise ValueError(f"Image too small. Minimum dimension is {MIN_IMAGE_DIMENSION}px.")

    # Resize if too large
    if w > MAX_IMAGE_DIMENSION or h > MAX_IMAGE_DIMENSION:
        img.thumbnail((MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION), Image.LANCZOS)

    # Save
    filename = f"{prefix}_{uuid.uuid4().hex}.jpg"
    full_path = os.path.join(save_dir, filename)
    os.makedirs(save_dir, exist_ok=True)
    img.save(full_path, "JPEG", quality=92)
    logger.info(f"Saved image: {full_path}")
    return filename, full_path


def delete_file_if_exists(path: str):
    try:
        if os.path.exists(path):
            os.remove(path)
            logger.info(f"Deleted file: {path}")
    except Exception as e:
        logger.warning(f"Could not delete file {path}: {e}")


def get_image_url(filename: str, category: str) -> str:
    """Build URL for a stored image."""
    return f"/static/{category}/{filename}"
