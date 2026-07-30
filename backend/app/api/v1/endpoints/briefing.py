"""
REST API endpoints for Module 9: AI Executive Co-Pilot & Decision Briefing Generator.
"""
import uuid
from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import RequirePermission, get_current_active_user
from app.db.session import get_db
from app.models.user import User
from app.models.workspace import Workspace
from app.schemas.briefing import (
    BriefingQnaRequest,
    BriefingQnaResponse,
    BriefingRequest,
    BriefingResponse,
)
from app.services.briefing_service import BriefingService
from app.services.dataset_service import DatasetService
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


@router.post(
    "/generate",
    response_model=BriefingResponse,
    summary="Generate a multi-module C-Suite strategic decision briefing report and Markdown memo",
)
async def generate_executive_briefing(
    dataset_id: uuid.UUID,
    request: BriefingRequest,
    workspace: Workspace = Depends(get_workspace_for_slug),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Synthesizes insights across Data Health, EDA, Forecasting, XAI Driver Trees,
    and Prescriptive Optimization into an export-ready executive presentation report.
    """
    ds_service = DatasetService(db)
    dataset = await ds_service.get_dataset(
        dataset_id=dataset_id, workspace_id=workspace.id
    )

    brf_service = BriefingService(db)
    return await brf_service.generate_executive_briefing(
        dataset=dataset, request=request
    )


@router.post(
    "/qna",
    response_model=BriefingQnaResponse,
    summary="Ask follow-up strategic questions to the AI Executive Co-Pilot",
)
async def answer_copilot_qna(
    dataset_id: uuid.UUID,
    request: BriefingQnaRequest,
    workspace: Workspace = Depends(get_workspace_for_slug),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Answers executive strategic questions over dataset metrics with confidence scores.
    """
    ds_service = DatasetService(db)
    dataset = await ds_service.get_dataset(
        dataset_id=dataset_id, workspace_id=workspace.id
    )

    brf_service = BriefingService(db)
    return await brf_service.answer_copilot_qna(
        dataset=dataset, request=request
    )
