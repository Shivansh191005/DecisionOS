"""
Pydantic v2 schemas for User account serialization.
"""
import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr


class UserResponse(BaseModel):
    """User profile serialization schema."""

    id: uuid.UUID
    email: EmailStr
    full_name: str
    avatar_url: Optional[str] = None
    is_active: bool
    is_verified: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserUpdate(BaseModel):
    """Schema for updating user profile settings."""

    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
