"""
Pydantic v2 schemas for Workspace and Activity Log serialization.
"""
import uuid
from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import BaseModel, ConfigDict, Field


class WorkspaceCreate(BaseModel):
    """Payload for creating a new Workspace in an Organization."""

    name: str = Field(..., min_length=2, max_length=255)
    description: Optional[str] = Field(None, max_length=1024)


class WorkspaceResponse(BaseModel):
    """Workspace serialization schema."""

    id: uuid.UUID
    organization_id: uuid.UUID
    name: str
    slug: str
    description: Optional[str] = None
    is_default: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ActivityLogResponse(BaseModel):
    """Activity log timeline serialization schema."""

    id: uuid.UUID
    workspace_id: uuid.UUID
    user_id: Optional[uuid.UUID] = None
    action_type: str
    description: str
    metadata_json: Dict[str, Any]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
