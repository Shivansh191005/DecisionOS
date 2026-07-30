"""
Pydantic v2 schemas for Module 7: Explainable AI & Driver Trees (Causal Attribution Engine & Root Cause Trees).
"""
from __future__ import annotations
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class DriverNode(BaseModel):
    """
    Recursive schema representing a hierarchical node in a causal Driver Tree.
    """
    id: str = Field(..., description="Unique node identifier")
    name: str = Field(..., description="Node label or segment name")
    dimension: str = Field(..., description="Driver column or 'root'")
    value: float = Field(..., description="Aggregate target KPI value at this node")
    sample_count: int = Field(..., description="Number of rows in this branch")
    contribution_pct: float = Field(
        ..., description="Percentage contribution relative to total root KPI (0 to 100)"
    )
    impact_direction: str = Field(
        ..., description="POSITIVE, NEGATIVE, or NEUTRAL impact on target KPI"
    )
    sensitivity_score: float = Field(
        ..., description="Estimated KPI delta if this node's driver elasticity shifts by +10%"
    )
    children: List[DriverNode] = Field(
        default_factory=list, description="Child branch nodes"
    )


class DriverRanking(BaseModel):
    """
    Shapley-style relative driver importance ranking for a feature column.
    """
    feature_name: str = Field(..., description="Name of the driver column")
    importance_score: float = Field(
        ..., description="Relative contribution score from 0 to 100"
    )
    direction: str = Field(
        ..., description="POSITIVE growth driver or NEGATIVE drag factor"
    )
    stat_metric: str = Field(
        ..., description="Statistical ANOVA / Variance Reduction explanation"
    )


class DriverTreeRequest(BaseModel):
    """
    Request payload to generate a hierarchical Driver Tree and Shapley attribution.
    """
    target_column: str = Field(..., description="Name of the target KPI column")
    driver_columns: Optional[List[str]] = Field(
        default=None,
        description="Optional explicit list of driver columns; if omitted, all available candidate columns are used",
    )
    max_depth: int = Field(
        default=3, ge=1, le=5, description="Maximum tree depth for branching"
    )
    top_k_branches: int = Field(
        default=4, ge=2, le=10, description="Top K branches per driver dimension"
    )


class DriverTreeResponse(BaseModel):
    """
    Response payload containing the generated Driver Tree, rankings, and AI narrative.
    """
    target_column: str = Field(..., description="Target KPI column")
    total_kpi_value: float = Field(..., description="Total root KPI aggregate value")
    root_node: DriverNode = Field(..., description="Root node of the causal driver tree")
    driver_rankings: List[DriverRanking] = Field(
        ..., description="Shapley-style driver importance ranking list"
    )
    ai_narrative: str = Field(
        ..., description="Plain-English AI Root Cause executive summary"
    )
    execution_time_ms: float = Field(
        ..., description="Query and tree decomposition execution latency in milliseconds"
    )


class XAIMetadataResponse(BaseModel):
    """
    Available target numeric KPIs and categorical driver feature columns.
    """
    numeric_columns: List[str] = Field(
        ..., description="Candidate numeric target KPI columns"
    )
    categorical_columns: List[str] = Field(
        ..., description="Candidate categorical driver feature columns"
    )
