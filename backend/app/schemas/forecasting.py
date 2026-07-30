"""
Pydantic v2 schemas for Automated Time-Series Forecasting & What-If Scenario Engine.
"""
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class TimeSeriesMetadataResponse(BaseModel):
    """Available datetime/date index columns and numeric KPI columns for forecasting."""

    date_columns: List[str]
    numeric_columns: List[str]


class ForecastRequest(BaseModel):
    """Request payload for generating an automated time-series forecast."""

    date_column: str
    target_column: str
    agg_fn: str = Field("SUM", description="SUM | AVG | COUNT | MAX | MIN")
    horizon: int = Field(12, ge=1, le=120, description="Number of periods to forecast ahead")
    frequency: str = Field("M", description="D | W | M | Q | Y")
    model_type: str = Field(
        "AUTO", description="AUTO | ETS | ARIMA | LINEAR_TREND"
    )


class ForecastDataPoint(BaseModel):
    """Single period data point with historical actuals, forecast, and 80%/95% confidence bounds."""

    date: str
    actual_value: Optional[float] = None
    forecast_value: Optional[float] = None
    lower_80: Optional[float] = None
    upper_80: Optional[float] = None
    lower_95: Optional[float] = None
    upper_95: Optional[float] = None
    is_forecast: bool = False


class ForecastAccuracyMetrics(BaseModel):
    """Diagnostic error metrics for the selected time-series model."""

    mape: float
    rmse: float
    mae: float
    model_type_used: str
    seasonality_detected: bool


class AIInsightBrief(BaseModel):
    """AI natural language storytelling brief card."""

    id: str
    category: str
    title: str
    description: str
    metric_badge: str
    severity: str = "INFO"


class ForecastResponse(BaseModel):
    """Complete time-series forecast response."""

    dataset_id: str
    dataset_name: str
    date_column: str
    target_column: str
    frequency: str
    horizon: int
    model_type_used: str
    metrics: ForecastAccuracyMetrics
    data_points: List[ForecastDataPoint]
    ai_brief: AIInsightBrief


class WhatIfAdjustment(BaseModel):
    """Driver elasticity adjustment intervention for What-If simulation."""

    driver_column: str
    percentage_change: float = Field(..., ge=-100.0, le=500.0)
    elasticity: float = Field(0.5, ge=-5.0, le=5.0)


class WhatIfScenarioRequest(BaseModel):
    """Request payload for What-If scenario simulation."""

    target_column: str
    base_forecast_data_points: List[Dict[str, Any]]
    trend_multiplier: float = Field(1.0, ge=0.0, le=5.0)
    step_change_pct: float = Field(0.0, ge=-100.0, le=500.0)
    adjustments: List[WhatIfAdjustment] = []


class ScenarioComparisonPoint(BaseModel):
    """Single period comparison between baseline forecast and simulated forecast."""

    date: str
    baseline_value: float
    simulated_value: float
    delta_value: float
    delta_percentage: float
    is_forecast: bool = False


class WhatIfScenarioResponse(BaseModel):
    """Complete response for interactive What-If scenario simulation."""

    dataset_id: str
    dataset_name: str
    target_column: str
    baseline_total: float
    simulated_total: float
    net_delta: float
    net_percentage: float
    comparison_series: List[ScenarioComparisonPoint]
    ai_recommendation: AIInsightBrief
