"""
REST API endpoints for Module 6: NLQ-to-SQL (Natural Language to SQL Engine & AI Data Assistant).
"""
from typing import Any, List
import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import RequirePermission, get_current_active_user
from app.db.session import get_db
from app.models.user import User
from app.models.workspace import Workspace
from app.schemas.nlq import (
    NLQAskRequest,
    NLQAskResponse,
    NLQBookmarkCreate,
    NLQBookmarkResponse,
)
from app.services.dataset_service import DatasetService
from app.services.nlq_service import NLQService
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
    "/ask",
    response_model=NLQAskResponse,
    summary="Ask a plain-English question over a dataset to generate SQL and visual answers",
)
async def ask_natural_language_question(
    dataset_id: uuid.UUID,
    request: NLQAskRequest,
    workspace: Workspace = Depends(get_workspace_for_slug),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Synthesize a natural language question into safe DuckDB SQL, execute it,
    recommend a visualization chart type, and generate an AI answer narrative.
    """
    ds_service = DatasetService(db)
    dataset = await ds_service.get_dataset(
        dataset_id=dataset_id, workspace_id=workspace.id
    )

    nlq_service = NLQService(db)
    return await nlq_service.ask_question(dataset=dataset, question=request.question)


@router.get(
    "/bookmarks",
    response_model=List[NLQBookmarkResponse],
    summary="List all saved natural language question & SQL bookmarks for a dataset",
)
async def list_nlq_bookmarks(
    dataset_id: uuid.UUID,
    workspace: Workspace = Depends(get_workspace_for_slug),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Fetch all saved NLQ bookmarks for the specified dataset.
    """
    ds_service = DatasetService(db)
    await ds_service.get_dataset(
        dataset_id=dataset_id, workspace_id=workspace.id
    )

    nlq_service = NLQService(db)
    return await nlq_service.list_bookmarks(dataset_id=dataset_id)


@router.post(
    "/bookmarks",
    response_model=NLQBookmarkResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Save a natural language question & SQL query as an analytical bookmark",
)
async def save_nlq_bookmark(
    dataset_id: uuid.UUID,
    request: NLQBookmarkCreate,
    workspace: Workspace = Depends(get_workspace_for_slug),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Persist a natural language question, generated SQL, and chart type as a bookmark.
    """
    ds_service = DatasetService(db)
    dataset = await ds_service.get_dataset(
        dataset_id=dataset_id, workspace_id=workspace.id
    )

    nlq_service = NLQService(db)
    return await nlq_service.save_bookmark(
        dataset_id=dataset.id,
        workspace_id=workspace.id,
        question=request.question,
        generated_sql=request.generated_sql,
        chart_type=request.chart_type,
    )


@router.delete(
    "/bookmarks/{bookmark_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a saved natural language question bookmark",
)
async def delete_nlq_bookmark(
    dataset_id: uuid.UUID,
    bookmark_id: uuid.UUID,
    workspace: Workspace = Depends(get_workspace_for_slug),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> None:
    """
    Delete an NLQ bookmark by ID.
    """
    ds_service = DatasetService(db)
    await ds_service.get_dataset(
        dataset_id=dataset_id, workspace_id=workspace.id
    )

    nlq_service = NLQService(db)
    await nlq_service.delete_bookmark(bookmark_id=bookmark_id)
