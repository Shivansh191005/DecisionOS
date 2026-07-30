"""
Dataset Pydantic v2 Schemas for REST API response serialization and request validation.
"""
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


class DatasetRead(BaseModel):
    """Schema representing an uploaded dataset and its schema profiling metadata."""

    id: uuid.UUID
    workspace_id: uuid.UUID
    name: str
    file_name: str
    file_size_bytes: int
    file_type: str
    row_count: Optional[int] = None
    column_count: Optional[int] = None
    schema_metadata: Optional[Dict[str, Any]] = None
    status: str
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DatasetPreviewResponse(BaseModel):
    """Schema for DuckDB paginated dataset sample preview."""

    columns: List[str]
    rows: List[Dict[str, Any]]
    total_rows: int
    limit: int
    offset: int


class DatasetQueryRequest(BaseModel):
    """Request payload for DuckDB analytical aggregation queries."""

    sql_query: str = Field(
        ...,
        description="Safe SELECT SQL query. Use 'dataset' as the table name reference.",
        example="SELECT semantic_type, COUNT(*) FROM dataset GROUP BY 1",
    )


class DatasetQueryResponse(BaseModel):
    """Response payload for analytical aggregation queries."""

    columns: List[str]
    rows: List[Dict[str, Any]]
    row_count: int
    sql_executed: str
