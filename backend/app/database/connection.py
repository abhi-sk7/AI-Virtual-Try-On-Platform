"""Database connection with automatic MongoDB and mock fallback."""
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.core.config import settings
from datetime import datetime, timezone
import logging
import os

logger = logging.getLogger(__name__)

client = None
db = None
is_mock_db = False


async def connect_to_mongo():
    global client, db, is_mock_db
    logger.info(f"Connecting to MongoDB at {settings.MONGODB_URL}...")
    try:
        real_client = AsyncIOMotorClient(
            settings.MONGODB_URL,
            serverSelectionTimeoutMS=2000,
        )
        await real_client.admin.command("ping")
        client = real_client
        db = client[settings.MONGODB_DB_NAME]
        is_mock_db = False
        logger.info("✅ Connected to Live MongoDB.")
    except Exception as e:
        logger.warning(f"Could not connect to live MongoDB: {e}")
        logger.info("⚡ Activating in-memory AsyncMongoMock database for local execution...")
        import mongomock_motor
        client = mongomock_motor.AsyncMongoMockClient()
        db = client[settings.MONGODB_DB_NAME]
        is_mock_db = True
        logger.info("✅ In-memory mock database initialized.")

    await create_indexes()
    await seed_initial_data()


async def close_mongo_connection():
    global client
    if client and not is_mock_db:
        client.close()
        logger.info("MongoDB connection closed.")


async def create_indexes():
    """Create database indexes."""
    try:
        await db.users.create_index("email", unique=True)
        await db.products.create_index("category")
        await db.products.create_index("name")
        await db.favorites.create_index([("user_id", 1), ("product_id", 1)], unique=True)
        await db.tryon_history.create_index("user_id")
        await db.tryon_history.create_index("job_id", unique=True)
        await db.wardrobe.create_index("user_id")
    except Exception as e:
        logger.warning(f"Index creation notice: {e}")


async def seed_initial_data():
    """Seed sample categories, products, and admin if empty."""
    from app.core.security import get_password_hash
    from PIL import Image, ImageDraw

    # 1. Admin user
    existing_admin = await db.users.find_one({"email": "admin@virtualtryon.ai"})
    if not existing_admin:
        await db.users.insert_one({
            "name": "Platform Administrator",
            "email": "admin@virtualtryon.ai",
            "password_hash": get_password_hash("AdminPass123!"),
            "role": "admin",
            "created_at": datetime.now(timezone.utc),
            "measurements": {},
        })
        logger.info("Seeded default admin user: admin@virtualtryon.ai / AdminPass123!")

    # 2. Categories
    cat_count = await db.categories.count_documents({})
    if cat_count == 0:
        categories = [
            {"name": "T-Shirts", "parent": "upper_body", "description": "Casual t-shirts and tees"},
            {"name": "Shirts", "parent": "upper_body", "description": "Formal and casual button-down shirts"},
            {"name": "Hoodies", "parent": "upper_body", "description": "Comfortable street hoodies and pullovers"},
            {"name": "Jackets", "parent": "upper_body", "description": "Denim, leather, and winter jackets"},
            {"name": "Blazers", "parent": "upper_body", "description": "Tailored formal blazers"},
            {"name": "Jeans", "parent": "lower_body", "description": "Denim jeans in various cuts"},
            {"name": "Trousers", "parent": "lower_body", "description": "Chinos and formal trousers"},
            {"name": "Skirts", "parent": "lower_body", "description": "Casual and pleated skirts"},
            {"name": "Dresses", "parent": "full_body", "description": "Summer and evening dresses"},
            {"name": "Jumpsuits", "parent": "full_body", "description": "Modern full-body jumpsuits"},
            {"name": "Glasses", "parent": "accessory", "description": "Sunglasses and optical frames"},
            {"name": "Watches", "parent": "accessory", "description": "Luxury and smart wristwatches"},
        ]
        await db.categories.insert_many([
            {**c, "created_at": datetime.now(timezone.utc)} for c in categories
        ])
        logger.info(f"Seeded {len(categories)} categories.")

    # 3. Seed sample products & generate real image assets
    prod_count = await db.products.count_documents({})
    if prod_count == 0:
        os.makedirs(settings.PRODUCTS_PATH, exist_ok=True)

        sample_items = [
            {
                "name": "Classic Oxford Cotton Shirt",
                "category": "Shirts",
                "brand": "Aura Wear",
                "price": 49.99,
                "garment_type": "upper_body",
                "colors": ["White", "Sky Blue", "Navy"],
                "sizes": ["S", "M", "L", "XL"],
                "stock": 45,
                "description": "Breathable 100% Egyptian cotton tailored fit shirt for smart casual and office wear.",
                "bg_color": (235, 240, 245),
                "accent_color": (41, 128, 185),
                "tags": ["bestseller", "cotton", "formal"]
            },
            {
                "name": "Oversized Streetwear Hoodie",
                "category": "Hoodies",
                "brand": "UrbanVibe",
                "price": 64.99,
                "garment_type": "upper_body",
                "colors": ["Charcoal", "Sage Green", "Black"],
                "sizes": ["M", "L", "XL", "XXL"],
                "stock": 30,
                "description": "Heavyweight 450gsm fleece hoodie with dropped shoulders and kangaroo pocket.",
                "bg_color": (230, 230, 230),
                "accent_color": (44, 62, 80),
                "tags": ["streetwear", "oversized", "winter"]
            },
            {
                "name": "Vintage Washed Denim Jacket",
                "category": "Jackets",
                "brand": "Heritage Denim",
                "price": 89.99,
                "garment_type": "upper_body",
                "colors": ["Washed Blue", "Vintage Black"],
                "sizes": ["S", "M", "L", "XL"],
                "stock": 20,
                "description": "Classic 90s inspired denim jacket with brass button closures and twin chest pockets.",
                "bg_color": (220, 230, 242),
                "accent_color": (52, 73, 94),
                "tags": ["denim", "vintage", "outerwear"]
            },
            {
                "name": "Tailored Slim Navy Blazer",
                "category": "Blazers",
                "brand": "Sartorial Lab",
                "price": 129.99,
                "garment_type": "upper_body",
                "colors": ["Navy", "Charcoal"],
                "sizes": ["38R", "40R", "42R", "44R"],
                "stock": 15,
                "description": "Italian wool-blend two-button blazer with notch lapels and structured shoulder construction.",
                "bg_color": (225, 230, 240),
                "accent_color": (26, 36, 64),
                "tags": ["luxury", "formal", "suit"]
            },
            {
                "name": "Essential Heavyweight Tee",
                "category": "T-Shirts",
                "brand": "Minimal Co.",
                "price": 28.00,
                "garment_type": "upper_body",
                "colors": ["White", "Black", "Olive", "Sand"],
                "sizes": ["XS", "S", "M", "L", "XL"],
                "stock": 100,
                "description": "Premium 240gsm combed cotton t-shirt with a structured collar that never sags.",
                "bg_color": (245, 242, 238),
                "accent_color": (100, 110, 120),
                "tags": ["basics", "cotton", "everyday"]
            },
            {
                "name": "Relaxed Straight-Leg Denim Jeans",
                "category": "Jeans",
                "brand": "Heritage Denim",
                "price": 74.99,
                "garment_type": "lower_body",
                "colors": ["Light Wash", "Dark Indigo"],
                "sizes": ["30x32", "32x32", "34x32", "36x32"],
                "stock": 40,
                "description": "Authentic selvedge straight leg jeans with copper rivets and button fly.",
                "bg_color": (230, 238, 248),
                "accent_color": (41, 75, 120),
                "tags": ["denim", "casual"]
            },
            {
                "name": "Floral Summer Chiffon Dress",
                "category": "Dresses",
                "brand": "Fleur Studio",
                "price": 79.50,
                "garment_type": "full_body",
                "colors": ["Blush Floral", "Sage Floral"],
                "sizes": ["XS", "S", "M", "L"],
                "stock": 25,
                "description": "Airy tiered midi dress with subtle ruffles and waist cinch belt.",
                "bg_color": (250, 235, 235),
                "accent_color": (192, 57, 43),
                "tags": ["dress", "summer", "floral"]
            },
            {
                "name": "Classic Aviator Gold Sunglasses",
                "category": "Glasses",
                "brand": "Lumina Optics",
                "price": 54.00,
                "garment_type": "accessory",
                "colors": ["Gold/Green", "Silver/Smoke"],
                "sizes": ["Standard"],
                "stock": 50,
                "description": "UV400 polarized teardrop aviators with lightweight stainless steel frame.",
                "bg_color": (250, 245, 230),
                "accent_color": (180, 140, 40),
                "tags": ["accessories", "eyewear"]
            }
        ]

        products_to_insert = []
        for i, item in enumerate(sample_items):
            # Generate sample garment image
            img_filename = f"prod_sample_{i+1}.jpg"
            img_path = os.path.join(settings.PRODUCTS_PATH, img_filename)

            img = Image.new("RGB", (600, 800), color=item["bg_color"])
            draw = ImageDraw.Draw(img)

            # Draw stylish garment silhouette / card
            acc = item["accent_color"]
            if item["garment_type"] == "upper_body":
                # Torso silhouette
                draw.rectangle([180, 180, 420, 620], fill=acc)
                draw.polygon([(180, 180), (100, 320), (160, 360), (180, 240)], fill=acc)
                draw.polygon([(420, 180), (500, 320), (440, 360), (420, 240)], fill=acc)
                # Collar / Neck
                draw.ellipse([250, 140, 350, 210], fill=item["bg_color"])
            elif item["garment_type"] == "lower_body":
                # Pants silhouette
                draw.polygon([(200, 180), (400, 180), (420, 700), (320, 700), (300, 360), (280, 700), (180, 700)], fill=acc)
            elif item["garment_type"] == "full_body":
                # Dress silhouette
                draw.polygon([(230, 180), (370, 180), (460, 680), (140, 680)], fill=acc)
            else:
                # Accessory / Glasses
                draw.ellipse([150, 300, 280, 420], outline=acc, width=8)
                draw.ellipse([320, 300, 450, 420], outline=acc, width=8)
                draw.line([(280, 350), (320, 350)], fill=acc, width=8)

            img.save(img_path, "JPEG", quality=92)

            products_to_insert.append({
                "name": item["name"],
                "description": item["description"],
                "category": item["category"],
                "brand": item["brand"],
                "price": item["price"],
                "colors": item["colors"],
                "sizes": item["sizes"],
                "stock": item["stock"],
                "garment_type": item["garment_type"],
                "images": [f"/static/products/{img_filename}"],
                "tags": item["tags"],
                "is_active": True,
                "created_at": datetime.now(timezone.utc),
            })

        await db.products.insert_many(products_to_insert)
        logger.info(f"Seeded {len(products_to_insert)} sample fashion products with mock imagery.")


def get_db():
    return db
