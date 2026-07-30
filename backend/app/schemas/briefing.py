"""
Pydantic v2 schemas for Module 9: AI Executive Co-Pilot & Decision Briefing Generator.
"""
from __future__ import annotations
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class BriefingRequest(BaseModel):
    """
    Request payload to generate a multi-module C-Suite strategic decision briefing.
    """
    title: Optional[str] = Field(
        default=None,
        description="Custom title for executive briefing report",
    )
    target_column: Optional[str] = Field(
        default=None,
        description="Primary Target KPI numeric column to focus analysis on",
    )
    include_forecasting: bool = Field(
        default=True,
        description="Include time-series forecasting & growth trend analysis",
    )
    include_xai: bool = Field(
        default=True,
        description="Include explainable AI driver trees & root cause attribution",
    )
    include_optimization: bool = Field(
        default=True,
        description="Include prescriptive resource allocation & optimization plan",
    )
    executive_notes: Optional[str] = Field(
        default=None,
        description="Custom executive notes or strategic context to weave into memo",
    )


class BriefingSection(BaseModel):
    """
    A structured diagnostic section within an executive decision briefing.
    """
    section_id: str = Field(
        ...,
        description="Unique section identifier (e.g., 'DATA_HEALTH', 'EDA_STATS', 'FORECAST', 'XAI_ROOT_CAUSE', 'PRESCRIPTIVE_PLAN')",
    )
    title: str = Field(..., description="Section display title")
    badge_text: str = Field(..., description="High-impact highlight badge text")
    summary_text: str = Field(
        ..., description="Plain-English executive summary paragraph"
    )
    metrics: Dict[str, Any] = Field(
        default_factory=dict,
        description="Key quantitative diagnostic metrics dictionary",
    )
    recommendation: Optional[str] = Field(
        default=None,
        description="Actionable strategic recommendation for this section",
    )


class BriefingResponse(BaseModel):
    """
    Complete executive decision briefing report with markdown memo and structured sections.
    """
    briefing_id: str = Field(..., description="Unique generated briefing report ID")
    dataset_id: str = Field(..., description="Dataset UUID analyzed")
    dataset_name: str = Field(..., description="Dataset display name")
    title: str = Field(..., description="Briefing report display title")
    generated_at: str = Field(
        ..., description="ISO-8601 timestamp of briefing generation"
    )
    executive_memo_markdown: str = Field(
        ...,
        description="Complete C-Suite strategic memo formatted in Markdown for export/presentation",
    )
    sections: List[BriefingSection] = Field(
        ..., description="List of structured diagnostic sections across modules"
    )
    overall_health_score: float = Field(
        ..., description="Overall dataset health and performance score (0 to 100)"
    )
    execution_time_ms: float = Field(
        ..., description="Total multi-module DuckDB query and synthesis latency in ms"
    )


class BriefingQnaRequest(BaseModel):
    """
    Request payload to ask follow-up strategic questions to the AI Executive Co-Pilot.
    """
    question: str = Field(
        ...,
        description="Strategic executive question (e.g., 'What is our primary growth driver?')",
    )
    target_column: Optional[str] = Field(
        default=None,
        description="Primary Target KPI column",
    )
    context_section: Optional[str] = Field(
        default=None,
        description="Optional briefing section ID context",
    )


class BriefingQnaResponse(BaseModel):
    """
    Response from the AI Executive Co-Pilot for strategic Q&A.
    """
    question: str = Field(..., description="Original question asked")
    answer_text: str = Field(..., description="AI Co-Pilot plain-English answer")
    supporting_metric: str = Field(
        ..., description="Supporting quantitative metric or SQL fact from DuckDB"
    )
    confidence_score: float = Field(
        ..., description="Confidence percentage score (0 to 100)"
    )
