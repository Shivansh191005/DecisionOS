"""
REST API endpoints for Data Cleaning, Imputation & Feature Engineering Studio.
"""
import uuid
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import RequirePermission, get_current_active_user
from app.db.session import get_db
from app.models.user import User
from app.models.workspace import Workspace
from app.schemas.cleaning import (
    CleaningCommitRequest,
    CleaningPreviewRequest,
    CleaningRecipeCreate,
    CleaningRecipeResponse,
    CleaningRecommendationResponse,
)
from app.schemas.dataset import DatasetPreviewResponse, DatasetRead
from app.services.cleaning_service import CleaningService
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


async def get_workspace_for_slug_write(
    workspace_slug: str,
    org_id: uuid.UUID = Depends(RequirePermission("dataset:write")),
    db: AsyncSession = Depends(get_db),
) -> Workspace:
    """Dependency helper resolving a Workspace by slug with 'dataset:write' RBAC."""
    ws_service = WorkspaceService(db)
    return await ws_service.get_workspace_by_slug(org_id, workspace_slug)


@router.get(
    "/recipes",
    response_model=List[CleaningRecipeResponse],
    summary="List saved cleaning recipes for dataset",
)
async def list_cleaning_recipes(
    dataset_id: uuid.UUID,
    workspace: Workspace = Depends(get_workspace_for_slug),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> List[CleaningRecipeResponse]:
    """
    Fetch all saved data cleaning and transformation recipes for a dataset.
    Requires 'dataset:read' RBAC permission.
    """
    ds_service = DatasetService(db)
    await ds_service.get_dataset(dataset_id=dataset_id, workspace_id=workspace.id)

    clean_service = CleaningService(db)
    recipes = await clean_service.list_recipes(
        dataset_id=dataset_id, workspace_id=workspace.id
    )
    return [CleaningRecipeResponse.model_validate(r) for r in recipes]


@router.post(
    "/recipes",
    response_model=CleaningRecipeResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new cleaning recipe",
)
async def create_cleaning_recipe(
    dataset_id: uuid.UUID,
    payload: CleaningRecipeCreate,
    workspace: Workspace = Depends(get_workspace_for_slug_write),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> CleaningRecipeResponse:
    """
    Create and save a non-destructive data cleaning recipe.
    Requires 'dataset:write' RBAC permission.
    """
    ds_service = DatasetService(db)
    await ds_service.get_dataset(dataset_id=dataset_id, workspace_id=workspace.id)

    clean_service = CleaningService(db)
    recipe = await clean_service.create_recipe(
        dataset_id=dataset_id,
        workspace_id=workspace.id,
        name=payload.name,
        description=payload.description or "",
        steps=payload.steps,
    )
    return CleaningRecipeResponse.model_validate(recipe)


@router.get(
    "/recipes/{recipe_id}",
    response_model=CleaningRecipeResponse,
    summary="Get cleaning recipe details",
)
async def get_cleaning_recipe(
    dataset_id: uuid.UUID,
    recipe_id: uuid.UUID,
    workspace: Workspace = Depends(get_workspace_for_slug),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> CleaningRecipeResponse:
    """
    Fetch details of a specific cleaning recipe.
    Requires 'dataset:read' RBAC permission.
    """
    clean_service = CleaningService(db)
    recipe = await clean_service.get_recipe(
        recipe_id=recipe_id, workspace_id=workspace.id
    )
    return CleaningRecipeResponse.model_validate(recipe)


@router.delete(
    "/recipes/{recipe_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a cleaning recipe",
)
async def delete_cleaning_recipe(
    dataset_id: uuid.UUID,
    recipe_id: uuid.UUID,
    workspace: Workspace = Depends(get_workspace_for_slug_write),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> None:
    """
    Delete a cleaning recipe by ID.
    Requires 'dataset:write' RBAC permission.
    """
    clean_service = CleaningService(db)
    await clean_service.delete_recipe(recipe_id=recipe_id, workspace_id=workspace.id)


@router.post(
    "/preview",
    response_model=DatasetPreviewResponse,
    summary="Live DuckDB paginated preview of dataset with cleaning steps applied",
)
async def preview_cleaning_steps(
    dataset_id: uuid.UUID,
    payload: CleaningPreviewRequest,
    workspace: Workspace = Depends(get_workspace_for_slug),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> DatasetPreviewResponse:
    """
    Execute DuckDB vectorized query over the dataset with the specified cleaning steps
    applied on-the-fly and return a paginated sample.
    Requires 'dataset:read' RBAC permission.
    """
    ds_service = DatasetService(db)
    dataset = await ds_service.get_dataset(
        dataset_id=dataset_id, workspace_id=workspace.id
    )

    clean_service = CleaningService(db)
    result = await clean_service.preview_recipe(
        dataset=dataset,
        steps=payload.steps,
        limit=payload.limit,
        offset=payload.offset,
    )
    return DatasetPreviewResponse(
        columns=result["columns"],
        rows=result["rows"],
        total_rows=result["total_rows"],
        limit=result.get("limit", payload.limit),
        offset=result.get("offset", payload.offset),
    )


@router.get(
    "/recommendations",
    response_model=List[CleaningRecommendationResponse],
    summary="Get automated AI cleaning diagnostic recommendations",
)
async def get_cleaning_recommendations(
    dataset_id: uuid.UUID,
    workspace: Workspace = Depends(get_workspace_for_slug),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> List[CleaningRecommendationResponse]:
    """
    Scan dataset schema scorecard and return intelligent One-Click Fix cleaning recommendations.
    Requires 'dataset:read' RBAC permission.
    """
    ds_service = DatasetService(db)
    dataset = await ds_service.get_dataset(
        dataset_id=dataset_id, workspace_id=workspace.id
    )

    clean_service = CleaningService(db)
    recs = await clean_service.get_recommendations(dataset)
    return [CleaningRecommendationResponse(**r) for r in recs]


@router.post(
    "/commit",
    response_model=DatasetRead,
    status_code=status.HTTP_201_CREATED,
    summary="Materialize cleaning recipe into a new clean Dataset",
)
async def commit_cleaning_recipe(
    dataset_id: uuid.UUID,
    payload: CleaningCommitRequest,
    workspace: Workspace = Depends(get_workspace_for_slug_write),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> DatasetRead:
    """
    Materialize the transformation pipeline by exporting a new clean dataset file
    and registering a versioned Dataset record in the workspace.
    Requires 'dataset:write' RBAC permission.
    """
    ds_service = DatasetService(db)
    dataset = await ds_service.get_dataset(
        dataset_id=dataset_id, workspace_id=workspace.id
    )

    clean_service = CleaningService(db)
    new_dataset = await clean_service.commit_recipe(
        dataset=dataset,
        workspace_id=workspace.id,
        new_dataset_name=payload.new_dataset_name,
        steps=payload.steps,
    )
    return DatasetRead.model_validate(new_dataset)
