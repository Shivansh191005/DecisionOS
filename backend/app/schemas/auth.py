"""
Pydantic v2 schemas for authentication endpoints (Login, Register, Token rotation).
"""
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class RegisterRequest(BaseModel):
    """Payload for registering a new enterprise account."""

    email: EmailStr
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters")
    full_name: str = Field(..., min_length=2, max_length=255)
    organization_name: Optional[str] = Field(
        None, max_length=255, description="Optional custom organization name"
    )

    model_config = ConfigDict(from_attributes=True)


class LoginRequest(BaseModel):
    """Payload for user sign-in."""

    email: EmailStr
    password: str


class GoogleAuthRequest(BaseModel):
    """Payload for Google OAuth SSO login/register."""

    google_id: str = Field(..., description="Unique Google subject ID")
    email: EmailStr
    full_name: str
    avatar_url: Optional[str] = None


class RefreshTokenRequest(BaseModel):
    """Payload for rotating JWT refresh token."""

    refresh_token: str


class TokenResponse(BaseModel):
    """JWT Access and Refresh token response payload."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = 900  # 15 minutes in seconds
