import pytest
import os
import sys

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "backend")))

from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_health_endpoint(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "version" in data


def test_list_products(client):
    response = client.get("/api/products")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert len(data["items"]) > 0


def test_list_categories(client):
    response = client.get("/api/categories")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0


def test_admin_login(client):
    response = client.post(
        "/api/auth/login",
        json={"email": "admin@virtualtryon.ai", "password": "AdminPass123!"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["role"] == "admin"


def test_user_registration_and_login(client):
    import uuid
    random_email = f"user_{uuid.uuid4().hex[:8]}@example.com"
    reg_response = client.post(
        "/api/auth/register",
        json={"name": "Test User", "email": random_email, "password": "Password123!"},
    )
    assert reg_response.status_code == 201
    reg_data = reg_response.json()
    assert reg_data["user"]["email"] == random_email

    # Login
    login_response = client.post(
        "/api/auth/login",
        json={"email": random_email, "password": "Password123!"},
    )
    assert login_response.status_code == 200
    assert "access_token" in login_response.json()


def test_size_recommendation_calculation(client):
    login_resp = client.post(
        "/api/auth/login",
        json={"email": "admin@virtualtryon.ai", "password": "AdminPass123!"},
    )
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    prod_resp = client.get("/api/products")
    first_prod = prod_resp.json()["items"][0]

    rec_resp = client.post(
        "/api/tryon/size-recommend",
        headers=headers,
        json={
            "height": 180,
            "weight": 75,
            "chest": 98,
            "waist": 82,
            "preferred_fit": "regular",
            "product_id": first_prod["id"],
        },
    )
    assert rec_resp.status_code == 200
    rec_data = rec_resp.json()
    assert "recommended_size" in rec_data
    assert "disclaimer" in rec_data
