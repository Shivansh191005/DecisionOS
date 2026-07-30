"""
REST API endpoints for Module 7: Explainable AI & Driver Trees (Causal Attribution Engine & Root Cause Trees).
"""
from typing import Any
import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import RequirePermission, get_current_active_user
from app.db.session import get_db
from app.models.user import User
from app.models.workspace import Workspace
from app.schemas.xai import (
    DriverTreeRequest,
    DriverTreeResponse,
    XAIMetadataResponse,
)
from app.services.dataset_service import DatasetService
from app.services.workspace_service import WorkspaceService
from app.services.xai_service import XAIService

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
    response_model=XAIMetadataResponse,
    summary="Get candidate numeric Target KPI columns and categorical/numeric Driver columns",
)
async def get_xai_metadata(
    dataset_id: uuid.UUID,
    workspace: Workspace = Depends(get_workspace_for_slug),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Inspect dataset schema to return selectable target KPIs and driver features.
    """
    ds_service = DatasetService(db)
    dataset = await ds_service.get_dataset(
        dataset_id=dataset_id, workspace_id=workspace.id
    )

    xai_service = XAIService(db)
    return await xai_service.get_xai_metadata(dataset=dataset)


@router.post(
    "/driver-trees",
    response_model=DriverTreeResponse,
    summary="Generate hierarchical Driver Tree decomposition and Shapley driver attribution ranking",
)
async def generate_driver_tree(
    dataset_id: uuid.UUID,
    request: DriverTreeRequest,
    workspace: Workspace = Depends(get_workspace_for_slug),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Compute Shapley-style driver importance scores, build a multi-level root-cause tree,
    calculate what-if elasticity sensitivity deltas, and synthesize an AI executive narrative.
    """
    ds_service = DatasetService(db)
    dataset = await ds_service.get_dataset(
        dataset_id=dataset_id, workspace_id=workspace.id
    )

    xai_service = XAIService(db)
    return await xai_service.generate_driver_tree(
        dataset=dataset, request=request
    )
