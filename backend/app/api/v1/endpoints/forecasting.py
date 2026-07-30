"""
FastAPI REST controller for Automated Time-Series Forecasting & What-If Scenario Engine.
"""
import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import RequirePermission, get_current_active_user
from app.db.session import get_db
from app.models.user import User
from app.models.workspace import Workspace
from app.schemas.forecasting import (
    ForecastRequest,
    ForecastResponse,
    TimeSeriesMetadataResponse,
    WhatIfScenarioRequest,
    WhatIfScenarioResponse,
)
from app.services.dataset_service import DatasetService
from app.services.forecasting_service import ForecastingService
from app.services.simulation_service import SimulationService
from app.services.workspace_service import WorkspaceService

router = APIRouter()


async def get_workspace_for_slug(
    workspace_slug: str,
    org_id: uuid.UUID = Depends(RequirePermission("dataset:read")),
    db: AsyncSession = Depends(get_db),
) -> Workspace:
    """Dependency helper resolving a Workspace by slug with 'dataset:read' RBAC."""
    ws_service = WorkspaceService(db)
    return await ws_service.get_workspace_by_slug(org_id, workspace_slug)


@router.get(
    "/metadata",
    response_model=TimeSeriesMetadataResponse,
    summary="Get candidate datetime/date index columns and numeric KPI target columns",
)
async def get_time_series_metadata(
    dataset_id: uuid.UUID,
    workspace: Workspace = Depends(get_workspace_for_slug),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Inspect dataset schema to return selectable time-series columns for forecasting.
    """
    ds_service = DatasetService(db)
    dataset = await ds_service.get_dataset(
        dataset_id=dataset_id, workspace_id=workspace.id
    )

    forecasting_service = ForecastingService(db)
    return await forecasting_service.get_time_series_metadata(dataset)


@router.post(
    "/forecast",
    response_model=ForecastResponse,
    summary="Generate time-series forecast with 80%/95% confidence intervals and AI executive brief",
)
async def create_time_series_forecast(
    dataset_id: uuid.UUID,
    request: ForecastRequest,
    workspace: Workspace = Depends(get_workspace_for_slug),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Fit statistical time-series models (ETS, ARIMA, Linear Trend, or AUTO best-fit) over aggregated
    historical periods and project future values with prediction interval bounds.
    """
    ds_service = DatasetService(db)
    dataset = await ds_service.get_dataset(
        dataset_id=dataset_id, workspace_id=workspace.id
    )

    forecasting_service = ForecastingService(db)
    return await forecasting_service.generate_forecast(
        dataset=dataset,
        date_column=request.date_column,
        target_column=request.target_column,
        agg_fn=request.agg_fn,
        horizon=request.horizon,
        frequency=request.frequency,
        model_type=request.model_type,
    )


@router.post(
    "/what-if",
    response_model=WhatIfScenarioResponse,
    summary="Run interactive What-If scenario simulation with elasticity driver weights",
)
async def run_what_if_scenario_simulation(
    dataset_id: uuid.UUID,
    request: WhatIfScenarioRequest,
    workspace: Workspace = Depends(get_workspace_for_slug),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Simulate future KPI trajectory under customized business intervention parameters
    (trend acceleration, immediate step change %, and driver feature elasticities).
    """
    ds_service = DatasetService(db)
    dataset = await ds_service.get_dataset(
        dataset_id=dataset_id, workspace_id=workspace.id
    )

    simulation_service = SimulationService(db)
    adjustments_payload = [adj.model_dump() for adj in request.adjustments]

    return await simulation_service.run_what_if_scenario(
        dataset=dataset,
        target_column=request.target_column,
        base_forecast_data_points=request.base_forecast_data_points,
        trend_multiplier=request.trend_multiplier,
        step_change_pct=request.step_change_pct,
        adjustments=adjustments_payload,
    )
