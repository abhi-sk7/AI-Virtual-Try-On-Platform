import pytest
import os
import sys
import io
from PIL import Image

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "backend")))

from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="module")
def admin_token(client):
    res = client.post(
        "/api/auth/login",
        json={"email": "admin@virtualtryon.ai", "password": "AdminPass123!"},
    )
    assert res.status_code == 200
    return res.json()["access_token"]


@pytest.fixture(scope="module")
def test_user_token(client):
    import uuid
    email = f"user_{uuid.uuid4().hex[:8]}@example.com"
    res = client.post(
        "/api/auth/register",
        json={"name": "Integration Tester", "email": email, "password": "TestPassword123!"},
    )
    assert res.status_code == 201
    return res.json()["access_token"]


def create_dummy_image_bytes():
    buf = io.BytesIO()
    img = Image.new("RGB", (300, 400), color=(200, 220, 240))
    img.save(buf, format="JPEG")
    buf.seek(0)
    return buf.getvalue()


# ── TEST SUITE ─────────────────────────────────────────────────────────────

def test_admin_dashboard_and_users(client, admin_token, test_user_token):
    # Admin stats
    res = client.get("/api/admin/dashboard", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    stats = res.json()
    assert "total_users" in stats
    assert "total_products" in stats
    assert "total_tryon_requests" in stats

    # Admin users list
    res_users = client.get("/api/admin/users", headers={"Authorization": f"Bearer {admin_token}"})
    assert res_users.status_code == 200
    users = res_users.json()
    assert len(users) >= 2  # admin + created user

    # Security check: standard user forbidden from admin
    res_forbidden = client.get("/api/admin/dashboard", headers={"Authorization": f"Bearer {test_user_token}"})
    assert res_forbidden.status_code == 403


def test_favorites_lifecycle(client, test_user_token):
    headers = {"Authorization": f"Bearer {test_user_token}"}
    
    # 1. Get a product
    prods = client.get("/api/products").json()["items"]
    assert len(prods) > 0
    target_prod_id = prods[0]["id"]

    # 2. Add to favorites
    add_res = client.post(f"/api/favorites?product_id={target_prod_id}", headers=headers)
    assert add_res.status_code == 201
    fav_id = add_res.json()["id"]

    # 3. Duplicate favorite check (conflict 409)
    dup_res = client.post(f"/api/favorites?product_id={target_prod_id}", headers=headers)
    assert dup_res.status_code == 409

    # 4. List favorites
    list_res = client.get("/api/favorites", headers=headers)
    assert list_res.status_code == 200
    fav_items = list_res.json()
    assert any(f["product_id"] == target_prod_id for f in fav_items)

    # 5. Remove favorite
    del_res = client.delete(f"/api/favorites/{fav_id}", headers=headers)
    assert del_res.status_code == 204


def test_wardrobe_lifecycle(client, test_user_token):
    headers = {"Authorization": f"Bearer {test_user_token}"}
    
    prods = client.get("/api/products").json()["items"]
    target_prod_id = prods[0]["id"]

    # 1. Save outfit to wardrobe
    save_res = client.post(
        f"/api/wardrobe?product_id={target_prod_id}&generated_result_url=/static/products/sample.jpg&note=SummerStyle",
        headers=headers,
    )
    assert save_res.status_code == 201
    wardrobe_id = save_res.json()["id"]

    # 2. List wardrobe
    list_res = client.get("/api/wardrobe", headers=headers)
    assert list_res.status_code == 200
    items = list_res.json()
    assert any(w["id"] == wardrobe_id for w in items)

    # 3. Delete from wardrobe
    del_res = client.delete(f"/api/wardrobe/{wardrobe_id}", headers=headers)
    assert del_res.status_code == 204


def test_product_crud_and_image_upload(client, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Create product
    create_res = client.post(
        "/api/products",
        headers=headers,
        json={
            "name": "E2E Test Velvet Blazer",
            "description": "High-end luxurious tailored blazer for testing.",
            "category": "Blazers",
            "brand": "TestBrand",
            "price": 149.99,
            "colors": ["Midnight Blue", "Crimson"],
            "sizes": ["M", "L"],
            "stock": 10,
            "garment_type": "upper_body",
            "tags": ["test", "formal"],
        },
    )
    assert create_res.status_code == 201
    new_prod = create_res.json()
    prod_id = new_prod["id"]

    # 2. Upload image to product
    img_data = create_dummy_image_bytes()
    upload_res = client.post(
        f"/api/products/{prod_id}/images",
        headers=headers,
        files={"file": ("test_blazer.jpg", img_data, "image/jpeg")},
    )
    assert upload_res.status_code == 200
    updated_prod = upload_res.json()
    assert len(updated_prod["images"]) > 0

    # 3. Fetch product details
    detail_res = client.get(f"/api/products/{prod_id}")
    assert detail_res.status_code == 200
    assert detail_res.json()["name"] == "E2E Test Velvet Blazer"

    # 4. Clean up - delete product
    del_res = client.delete(f"/api/products/{prod_id}", headers=headers)
    assert del_res.status_code == 204


def test_virtual_tryon_photo_workflow(client, test_user_token):
    headers = {"Authorization": f"Bearer {test_user_token}"}

    # Fetch product with an image
    prods = client.get("/api/products").json()["items"]
    prod_with_img = next(p for p in prods if len(p.get("images", [])) > 0)

    # Submit virtual try-on with uploaded photo
    person_img_bytes = create_dummy_image_bytes()
    submit_res = client.post(
        "/api/tryon/photo",
        headers=headers,
        data={"product_id": prod_with_img["id"]},
        files={"person_image": ("user_photo.jpg", person_img_bytes, "image/jpeg")},
    )
    assert submit_res.status_code == 202
    job_info = submit_res.json()
    assert "job_id" in job_info
    job_id = job_info["job_id"]

    # Check job status
    status_res = client.get(f"/api/tryon/status/{job_id}", headers=headers)
    assert status_res.status_code == 200
    st = status_res.json()
    assert st["job_id"] == job_id
    assert st["status"] in ["queued", "processing", "done", "unavailable", "failed"]

    # Check history
    history_res = client.get("/api/tryon/history", headers=headers)
    assert history_res.status_code == 200
    history_list = history_res.json()
    assert any(h["job_id"] == job_id for h in history_list)
