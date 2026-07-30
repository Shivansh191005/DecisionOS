"""
Integration tests for authentication endpoints (/api/v1/auth/*).
"""
import pytest
import httpx
from fastapi import status


@pytest.mark.asyncio
async def test_register_and_login_flow(client: httpx.AsyncClient):
    """Test full registration, login, profile fetch, and token rotation flow."""
    # 1. Register a new user
    register_payload = {
        "email": "enterprise.ceo@decisionos.ai",
        "password": "SecurePassword123!",
        "full_name": "Elena Rostova",
        "organization_name": "Rostova Enterprises",
    }
    reg_response = await client.post("/api/v1/auth/register", json=register_payload)
    assert reg_response.status_code == status.HTTP_201_CREATED
    reg_data = reg_response.json()
    assert "access_token" in reg_data
    assert "refresh_token" in reg_data

    # 2. Duplicate registration should raise 409 Conflict
    dup_response = await client.post("/api/v1/auth/register", json=register_payload)
    assert dup_response.status_code == status.HTTP_409_CONFLICT

    # 3. Login with credentials
    login_payload = {
        "email": "enterprise.ceo@decisionos.ai",
        "password": "SecurePassword123!",
    }
    login_response = await client.post("/api/v1/auth/login", json=login_payload)
    assert login_response.status_code == status.HTTP_200_OK
    login_data = login_response.json()
    access_token = login_data["access_token"]
    refresh_token = login_data["refresh_token"]

    # 4. Fetch authenticated user profile (/api/v1/auth/me)
    headers = {"Authorization": f"Bearer {access_token}"}
    me_response = await client.get("/api/v1/auth/me", headers=headers)
    assert me_response.status_code == status.HTTP_200_OK
    me_data = me_response.json()
    assert me_data["email"] == "enterprise.ceo@decisionos.ai"
    assert me_data["full_name"] == "Elena Rostova"
    assert me_data["is_active"] is True

    # 5. Rotate refresh token
    refresh_response = await client.post(
        "/api/v1/auth/refresh", json={"refresh_token": refresh_token}
    )
    assert refresh_response.status_code == status.HTTP_200_OK
    refresh_data = refresh_response.json()
    assert "access_token" in refresh_data
    assert "refresh_token" in refresh_data
    assert refresh_data["refresh_token"] != refresh_token

    # 6. Logout using the new refresh token
    new_refresh = refresh_data["refresh_token"]
    logout_response = await client.post(
        "/api/v1/auth/logout",
        json={"refresh_token": new_refresh},
        headers=headers,
    )
    assert logout_response.status_code == status.HTTP_204_NO_CONTENT


@pytest.mark.asyncio
async def test_invalid_login_credentials(client: httpx.AsyncClient):
    """Test login fails with invalid email or password."""
    login_payload = {
        "email": "nonexistent@decisionos.ai",
        "password": "WrongPassword456",
    }
    response = await client.post("/api/v1/auth/login", json=login_payload)
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
