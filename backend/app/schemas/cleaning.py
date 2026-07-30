"""
Pydantic v2 schemas for Data Cleaning, Imputation & Feature Engineering Studio.
"""
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


class CleaningRecipeCreate(BaseModel):
    """Payload for creating a new cleaning recipe."""

    name: str = Field(default="My Cleaning Recipe", max_length=255)
    description: Optional[str] = Field(default="")
    steps: List[Dict[str, Any]] = Field(default_factory=list)


class CleaningRecipeResponse(BaseModel):
    """Response schema for a saved cleaning recipe."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    dataset_id: uuid.UUID
    workspace_id: uuid.UUID
    name: str
    description: Optional[str] = None
    steps: List[Dict[str, Any]]
    created_at: datetime
    updated_at: datetime


class CleaningPreviewRequest(BaseModel):
    """Payload for live DuckDB cleaning preview."""

    steps: List[Dict[str, Any]] = Field(default_factory=list)
    limit: int = Field(default=50, ge=1, le=500)
    offset: int = Field(default=0, ge=0)


class CleaningCommitRequest(BaseModel):
    """Payload for materializing a cleaning recipe into a brand new dataset."""

    new_dataset_name: str = Field(min_length=1, max_length=150)
    steps: List[Dict[str, Any]] = Field(default_factory=list)


class CleaningRecommendationResponse(BaseModel):
    """Automated AI cleaning diagnostic recommendation item."""

    id: str
    title: str
    reason: str
    severity: str  # e.g., "WARNING", "INFO", "CRITICAL"
    step: Dict[str, Any]
