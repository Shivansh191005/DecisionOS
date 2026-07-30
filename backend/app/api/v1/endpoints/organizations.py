"""
Organization REST API endpoints (/api/v1/organizations/*).
"""
from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.organization import OrganizationCreate, OrganizationResponse
from app.services.workspace_service import WorkspaceService

router = APIRouter()


@router.get(
    "",
    response_model=List[OrganizationResponse],
    status_code=status.HTTP_200_OK,
    summary="List accessible organizations for current user",
)
async def list_organizations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> List[OrganizationResponse]:
    """
    Retrieve all organizations where the authenticated user holds an active membership.
    """
    ws_service = WorkspaceService(db)
    orgs = await ws_service.list_user_organizations(user_id=current_user.id)
    return [OrganizationResponse.model_validate(org) for org in orgs]


@router.post(
    "",
    response_model=OrganizationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new organization",
)
async def create_organization(
    payload: OrganizationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> OrganizationResponse:
    """
    Create a new organization, bootstrap system RBAC roles, assign creator as Owner,
    and initialize the default Main Workspace.
    """
    ws_service = WorkspaceService(db)
    org, _ = await ws_service.create_organization_with_default_workspace(
        user=current_user,
        org_name=payload.name,
        plan=payload.plan,
    )
    return OrganizationResponse.model_validate(org)
