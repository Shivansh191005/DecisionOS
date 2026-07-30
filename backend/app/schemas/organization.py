"""
Pydantic v2 schemas for Organization and Role serialization.
"""
import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class OrganizationCreate(BaseModel):
    """Payload for creating a new Organization."""

    name: str = Field(..., min_length=2, max_length=255)
    plan: str = Field("enterprise", description="Subscription tier: starter, pro, enterprise")


class OrganizationResponse(BaseModel):
    """Organization serialization schema."""

    id: uuid.UUID
    name: str
    slug: str
    plan: str
    billing_email: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RoleResponse(BaseModel):
    """Role schema with permission tags."""

    id: uuid.UUID
    organization_id: uuid.UUID
    name: str
    permissions: List[str]
    is_system_role: bool

    model_config = ConfigDict(from_attributes=True)
