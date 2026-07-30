"""
Pydantic v2 schemas for Exploratory Data Analysis (EDA) & Auto-Insight Generator.
"""
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class CorrelationAlert(BaseModel):
    """Alert card for multicollinearity or significant linear relationships."""

    id: str
    title: str
    description: str
    severity: str = "WARNING"
    metric_badge: str


class CorrelationPair(BaseModel):
    """Pearson correlation coefficient between two numeric features."""

    column_x: str
    column_y: str
    correlation: float
    is_collinear: bool


class CorrelationMatrixResponse(BaseModel):
    """Response schema for numerical correlation matrix & alerts."""

    columns: List[str]
    pairs: List[CorrelationPair]
    matrix: Dict[str, Dict[str, float]]
    alerts: List[CorrelationAlert] = []


class HistogramBin(BaseModel):
    """Single equal-width histogram frequency bin."""

    bin_index: int
    range_start: float
    range_end: float
    label: str
    count: int


class DistributionResponse(BaseModel):
    """Univariate distribution statistics and histogram bins."""

    column: str
    min: float
    q1: float
    median: float
    q3: float
    max: float
    mean: float
    std: float
    iqr: float
    skewness: float
    skewness_label: str = "SYMMETRIC"
    skewness_alert: str = ""
    histogram_bins: List[HistogramBin]


class OutlierResponse(BaseModel):
    """Outlier detection response using Tukey IQR or Z-score boundaries."""

    column: str
    method: str
    lower_bound: float
    upper_bound: float
    total_outliers: int
    outlier_percentage: float
    sample_outliers: List[Dict[str, Any]]


class AutoInsightItem(BaseModel):
    """AI-generated ThoughtSpot/Zoho-style executive narrative briefing card."""

    id: str
    category: str = Field(..., description="DRIVER | RISK | PARETO | ANOMALY | INFO")
    title: str
    description: str
    metric_badge: str
    severity: str = "INFO"


class AutoInsightsBriefingResponse(BaseModel):
    """Complete executive narrative briefing response for a dataset."""

    dataset_id: str
    dataset_name: str
    total_insights: int
    insights: List[AutoInsightItem]
