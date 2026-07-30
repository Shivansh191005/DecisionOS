"""
Dataset REST API Endpoints for DecisionOS Module 2.
Exposes routes under `/api/v1/workspaces/{workspace_slug}/datasets` for
file upload, schema inspection, DuckDB OLAP previews, and safe SQL queries.
"""
from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, File, Form, Query, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import RequirePermission, get_current_active_user
from app.db.session import get_db
from app.models.user import User
from app.models.workspace import Workspace
from app.schemas.dataset import (
    DatasetPreviewResponse,
    DatasetQueryRequest,
    DatasetQueryResponse,
    DatasetRead,
)
from app.services.dataset_service import DatasetService
from app.services.workspace_service import WorkspaceService

router = APIRouter()


async def get_workspace_for_slug(
    workspace_slug: str,
    org_id: uuid.UUID = Depends(RequirePermission("dataset:read")),
    db: AsyncSession = Depends(get_db),
) -> Workspace:
    """Dependency helper resolving a Workspace by slug within the user's organization."""
    ws_service = WorkspaceService(db)
    return await ws_service.get_workspace_by_slug(org_id, workspace_slug)


async def get_workspace_for_slug_write(
    workspace_slug: str,
    org_id: uuid.UUID = Depends(RequirePermission("dataset:write")),
    db: AsyncSession = Depends(get_db),
) -> Workspace:
    """Dependency helper resolving a Workspace with 'dataset:write' permission enforcement."""
    ws_service = WorkspaceService(db)
    return await ws_service.get_workspace_by_slug(org_id, workspace_slug)


@router.post(
    "",
    response_model=DatasetRead,
    status_code=status.HTTP_201_CREATED,
    summary="Upload dataset file to workspace",
)
async def upload_dataset_file(
    file: UploadFile = File(...),
    dataset_name: Optional[str] = Form(None),
    workspace: Workspace = Depends(get_workspace_for_slug_write),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> DatasetRead:
    """
    Upload a CSV, Excel (.xlsx), or JSON file into the specified workspace.
    Automatically profiles the dataset and infers schema metadata.
    Requires 'dataset:write' RBAC permission.
    """
    ds_service = DatasetService(db)
    dataset = await ds_service.upload_dataset(
        workspace=workspace,
        user=current_user,
        file=file,
        dataset_name=dataset_name,
    )
    return DatasetRead.model_validate(dataset)


@router.get(
    "",
    response_model=List[DatasetRead],
    status_code=status.HTTP_200_OK,
    summary="List workspace datasets",
)
async def list_workspace_datasets(
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    workspace: Workspace = Depends(get_workspace_for_slug),
    db: AsyncSession = Depends(get_db),
) -> List[DatasetRead]:
    """
    List all datasets uploaded to the specified workspace.
    Requires 'dataset:read' RBAC permission.
    """
    ds_service = DatasetService(db)
    datasets = await ds_service.list_workspace_datasets(
        workspace_id=workspace.id, limit=limit, offset=offset
    )
    return [DatasetRead.model_validate(ds) for ds in datasets]


@router.get(
    "/{dataset_id}",
    response_model=DatasetRead,
    status_code=status.HTTP_200_OK,
    summary="Get dataset details and schema metadata",
)
async def get_dataset_details(
    dataset_id: uuid.UUID,
    workspace: Workspace = Depends(get_workspace_for_slug),
    db: AsyncSession = Depends(get_db),
) -> DatasetRead:
    """
    Retrieve dataset details including inferred schema quality profiling scorecard.
    Requires 'dataset:read' RBAC permission.
    """
    ds_service = DatasetService(db)
    dataset = await ds_service.get_dataset(
        dataset_id=dataset_id, workspace_id=workspace.id
    )
    return DatasetRead.model_validate(dataset)


@router.get(
    "/{dataset_id}/preview",
    response_model=DatasetPreviewResponse,
    status_code=status.HTTP_200_OK,
    summary="Get paginated DuckDB data preview",
)
async def preview_dataset_rows(
    dataset_id: uuid.UUID,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    sort_by: Optional[str] = Query(None),
    sort_order: str = Query("asc", pattern="^(asc|desc|ASC|DESC)$"),
    workspace: Workspace = Depends(get_workspace_for_slug),
    db: AsyncSession = Depends(get_db),
) -> DatasetPreviewResponse:
    """
    Fetch paginated rows from the dataset using the DuckDB high-performance OLAP engine.
    Supports dynamic column sorting without loading full files into Python RAM.
    Requires 'dataset:read' RBAC permission.
    """
    ds_service = DatasetService(db)
    dataset = await ds_service.get_dataset(
        dataset_id=dataset_id, workspace_id=workspace.id
    )
    preview = await ds_service.preview_dataset(
        dataset=dataset,
        limit=limit,
        offset=offset,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    return DatasetPreviewResponse.model_validate(preview)


@router.post(
    "/{dataset_id}/query",
    response_model=DatasetQueryResponse,
    status_code=status.HTTP_200_OK,
    summary="Execute safe analytical DuckDB SQL query",
)
async def execute_dataset_sql_query(
    dataset_id: uuid.UUID,
    payload: DatasetQueryRequest,
    workspace: Workspace = Depends(get_workspace_for_slug),
    db: AsyncSession = Depends(get_db),
) -> DatasetQueryResponse:
    """
    Execute a safe read-only SQL aggregation query against the dataset using DuckDB.
    Use 'dataset' as the table name reference in your SQL string.
    Requires 'dataset:read' RBAC permission.
    """
    ds_service = DatasetService(db)
    dataset = await ds_service.get_dataset(
        dataset_id=dataset_id, workspace_id=workspace.id
    )
    result = await ds_service.query_dataset(
        dataset=dataset, sql_query=payload.sql_query
    )
    return DatasetQueryResponse.model_validate(result)


@router.delete(
    "/{dataset_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete dataset and storage file",
)
async def delete_dataset(
    dataset_id: uuid.UUID,
    workspace: Workspace = Depends(get_workspace_for_slug_write),
    db: AsyncSession = Depends(get_db),
) -> None:
    """
    Delete a dataset record from the database and remove its file from disk storage.
    Requires 'dataset:write' RBAC permission.
    """
    ds_service = DatasetService(db)
    await ds_service.delete_dataset(
        dataset_id=dataset_id, workspace_id=workspace.id
    )
