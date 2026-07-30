"""
Pydantic v2 schemas for Module 6: NLQ-to-SQL (Natural Language to SQL Engine & AI Data Assistant).
"""
import uuid
from datetime import datetime
from typing import Any, Dict, List

from pydantic import BaseModel, ConfigDict, Field


class NLQAskRequest(BaseModel):
    """Request payload for asking a natural language question over a dataset."""

    question: str = Field(
        ...,
        min_length=3,
        max_length=512,
        description="Plain-English analytical question to synthesize into SQL.",
    )


class NLQAskResponse(BaseModel):
    """Response payload containing generated SQL, tabular results, chart type, and AI answer."""

    question: str
    generated_sql: str
    execution_time_ms: float
    recommended_chart_type: str  # LINE_CHART, BAR_CHART, PIE_CHART, KPI_CARD, DATA_TABLE
    columns: List[str]
    rows: List[Dict[str, Any]]
    ai_answer: str


class NLQBookmarkCreate(BaseModel):
    """Request payload for bookmarking a natural language question and SQL query."""

    question: str = Field(..., min_length=3, max_length=512)
    generated_sql: str = Field(..., min_length=6)
    chart_type: str = Field("DATA_TABLE", max_length=64)


class NLQBookmarkResponse(BaseModel):
    """Response payload for a saved NLQ bookmark."""

    id: uuid.UUID
    dataset_id: uuid.UUID
    workspace_id: uuid.UUID
    question: str
    generated_sql: str
    chart_type: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
