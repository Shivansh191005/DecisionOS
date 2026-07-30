"""
Pydantic v2 schemas for Module 8: Prescriptive Optimization & Goal-Seeking Engine.
"""
from __future__ import annotations
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class OptimizationRequest(BaseModel):
    """
    Request payload to execute prescriptive decision optimization solver.
    """
    mode: str = Field(
        ..., description="Optimization solver mode: 'GOAL_SEEK' or 'RESOURCE_ALLOCATION'"
    )
    target_column: str = Field(
        ..., description="Name of the target numeric KPI column to optimize"
    )
    target_goal_value: Optional[float] = Field(
        default=None,
        description="Desired target KPI dollar or numeric goal (required for 'GOAL_SEEK')",
    )
    constraint_column: Optional[str] = Field(
        default=None,
        description="Name of the resource or driver column to adjust (e.g., 'marketing_spend')",
    )
    total_budget_constraint: Optional[float] = Field(
        default=None,
        description="Total budget or resource cap (required for 'RESOURCE_ALLOCATION')",
    )
    segment_column: Optional[str] = Field(
        default=None,
        description="Categorical column to segment allocations by (e.g., 'region')",
    )
    max_adjustment_pct: float = Field(
        default=50.0,
        ge=5.0,
        le=200.0,
        description="Maximum allowable adjustment percentage (+/- %) for any single segment",
    )


class OptimizationResultItem(BaseModel):
    """
    Recommended prescriptive allocation and expected ROI impact for a single segment.
    """
    segment_or_driver: str = Field(..., description="Segment label or driver name")
    current_value: float = Field(
        ..., description="Current baseline resource allocation or driver value"
    )
    recommended_value: float = Field(
        ..., description="Optimal recommended resource allocation or driver value"
    )
    adjustment_delta: float = Field(
        ..., description="Absolute difference (recommended - current)"
    )
    adjustment_pct: float = Field(
        ..., description="Percentage difference relative to current value"
    )
    expected_kpi_impact: float = Field(
        ..., description="Expected contribution to Target KPI from this allocation"
    )
    efficiency_roi: float = Field(
        ..., description="Marginal ROI efficiency multiple (e.g., 4.2x return per dollar)"
    )


class OptimizationResponse(BaseModel):
    """
    Executive prescriptive action plan and optimization solver response.
    """
    mode: str = Field(..., description="Optimization mode executed")
    target_column: str = Field(..., description="Target KPI column optimized")
    baseline_kpi_value: float = Field(
        ..., description="Current historical Target KPI aggregate sum"
    )
    optimized_kpi_value: float = Field(
        ..., description="Projected optimized Target KPI aggregate sum"
    )
    total_uplift_pct: float = Field(
        ..., description="Percentage uplift (optimized - baseline) / baseline * 100"
    )
    allocations: List[OptimizationResultItem] = Field(
        ..., description="Segment-by-segment recommended prescriptive allocations"
    )
    ai_prescriptive_narrative: str = Field(
        ..., description="Plain-English AI executive prescriptive action plan"
    )
    execution_time_ms: float = Field(
        ..., description="Solver and DuckDB aggregation latency in milliseconds"
    )


class OptimizationMetadataResponse(BaseModel):
    """
    Candidate target KPIs, resource constraint columns, and categorical segments.
    """
    numeric_columns: List[str] = Field(
        ..., description="Candidate numeric Target KPI or Resource Constraint columns"
    )
    categorical_columns: List[str] = Field(
        ..., description="Candidate categorical segment columns"
    )
