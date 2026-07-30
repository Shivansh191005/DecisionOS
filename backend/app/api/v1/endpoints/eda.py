"""
FastAPI REST controller for Exploratory Data Analysis (EDA), statistical distributions,
outlier detection, and AI Auto-Insight Briefings.
"""
import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import RequirePermission, get_current_active_user
from app.db.session import get_db
from app.models.user import User
from app.models.workspace import Workspace
from app.schemas.eda import (
    AutoInsightsBriefingResponse,
    CorrelationMatrixResponse,
    DistributionResponse,
    OutlierResponse,
)
from app.services.dataset_service import DatasetService
from app.services.eda_service import EDAService
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
    "/correlations",
    response_model=CorrelationMatrixResponse,
    summary="Get Pearson correlation matrix & multicollinearity alerts across numerical columns",
)
async def get_correlation_matrix(
    dataset_id: uuid.UUID,
    workspace: Workspace = Depends(get_workspace_for_slug),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Compute Pearson correlation coefficients across all numerical columns in the dataset
    and return an interactive matrix along with automated collinearity alerts (|r| >= 0.85).
    """
    ds_service = DatasetService(db)
    dataset = await ds_service.get_dataset(
        dataset_id=dataset_id, workspace_id=workspace.id
    )

    eda_service = EDAService(db)
    return await eda_service.get_correlation_matrix(dataset)


@router.get(
    "/distributions",
    response_model=DistributionResponse,
    summary="Get univariate histogram bin frequencies, boxplot quartiles, and skewness",
)
async def get_column_distribution(
    dataset_id: uuid.UUID,
    column: str = Query(..., description="Name of the numerical column to analyze"),
    workspace: Workspace = Depends(get_workspace_for_slug),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Compute 10-bin histogram frequencies, quartiles (min, Q1, median, Q3, max), IQR,
    and moment skewness coefficients for a specified column.
    """
    ds_service = DatasetService(db)
    dataset = await ds_service.get_dataset(
        dataset_id=dataset_id, workspace_id=workspace.id
    )

    eda_service = EDAService(db)
    return await eda_service.get_distribution(dataset=dataset, column=column)


@router.get(
    "/outliers",
    response_model=OutlierResponse,
    summary="Identify statistical outliers using Tukey IQR (1.5*IQR) or Z-score (|z| > 3)",
)
async def get_column_outliers(
    dataset_id: uuid.UUID,
    column: str = Query(..., description="Name of the numerical column to inspect"),
    method: str = Query("IQR", description="Outlier method: 'IQR' or 'ZSCORE'"),
    limit: int = Query(50, ge=1, le=500, description="Max sample outlier rows to return"),
    workspace: Workspace = Depends(get_workspace_for_slug),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Detect anomalous records in a numerical column using Tukey IQR or Z-Score boundaries,
    returning the exact outlier records and total outlier percentage.
    """
    ds_service = DatasetService(db)
    dataset = await ds_service.get_dataset(
        dataset_id=dataset_id, workspace_id=workspace.id
    )

    eda_service = EDAService(db)
    return await eda_service.get_outliers(
        dataset=dataset, column=column, method=method, limit=limit
    )


@router.get(
    "/insights",
    response_model=AutoInsightsBriefingResponse,
    summary="Generate automated AI Executive Narrative Briefing (Key Drivers, Risks, Pareto)",
)
async def get_auto_insights(
    dataset_id: uuid.UUID,
    workspace: Workspace = Depends(get_workspace_for_slug),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Synthesize automated ThoughtSpot / Zoho Analytics-style natural language briefing cards
    highlighting Key Drivers, Skewness Risk Alerts, Pareto 80/20 dominance, and data health.
    """
    ds_service = DatasetService(db)
    dataset = await ds_service.get_dataset(
        dataset_id=dataset_id, workspace_id=workspace.id
    )

    eda_service = EDAService(db)
    return await eda_service.generate_auto_insights(dataset)
