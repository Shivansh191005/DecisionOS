"""
REST API endpoints for Module 8: Prescriptive Optimization & Goal-Seeking Engine.
"""
import uuid
from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import RequirePermission, get_current_active_user
from app.db.session import get_db
from app.models.user import User
from app.models.workspace import Workspace
from app.schemas.optimization import (
    OptimizationMetadataResponse,
    OptimizationRequest,
    OptimizationResponse,
)
from app.services.dataset_service import DatasetService
from app.services.optimization_service import OptimizationService
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
    response_model=OptimizationMetadataResponse,
    summary="Get candidate numeric Target KPI/Resource columns and categorical Segment columns",
)
async def get_optimization_metadata(
    dataset_id: uuid.UUID,
    workspace: Workspace = Depends(get_workspace_for_slug),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Inspect dataset schema to return selectable Target KPIs, resource constraints, and segments.
    """
    ds_service = DatasetService(db)
    dataset = await ds_service.get_dataset(
        dataset_id=dataset_id, workspace_id=workspace.id
    )

    opt_service = OptimizationService(db)
    return await opt_service.get_optimization_metadata(dataset=dataset)


@router.post(
    "/solve",
    response_model=OptimizationResponse,
    summary="Execute Goal-Seeking or Constrained Resource Allocation solver",
)
async def solve_optimization(
    dataset_id: uuid.UUID,
    request: OptimizationRequest,
    workspace: Workspace = Depends(get_workspace_for_slug),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Compute prescriptive resource adjustments, marginal ROI efficiency ratios,
    projected KPI uplift, and an AI executive recommendation narrative.
    """
    ds_service = DatasetService(db)
    dataset = await ds_service.get_dataset(
        dataset_id=dataset_id, workspace_id=workspace.id
    )

    opt_service = OptimizationService(db)
    return await opt_service.solve_optimization(
        dataset=dataset, request=request
    )
