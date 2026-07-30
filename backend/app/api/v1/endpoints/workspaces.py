"""
Workspace REST API endpoints (/api/v1/workspaces/*).
"""
import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, Header, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import RequirePermission, get_current_active_user
from app.core.exceptions import BadRequestException
from app.db.session import get_db
from app.models.user import User
from app.schemas.workspace import (
    ActivityLogResponse,
    WorkspaceCreate,
    WorkspaceResponse,
)
from app.services.workspace_service import WorkspaceService

router = APIRouter()


def get_org_uuid(
    x_organization_id: Optional[str] = Header(None, alias="X-Organization-Id"),
    organization_id: Optional[str] = Query(None),
) -> uuid.UUID:
    """Extract and validate Organization UUID from header or query param."""
    org_id_str = x_organization_id or organization_id
    if not org_id_str:
        raise BadRequestException(
            "Organization ID required via X-Organization-Id header or organization_id parameter."
        )
    try:
        return uuid.UUID(org_id_str)
    except ValueError:
        raise BadRequestException("Invalid organization UUID format.")


@router.get(
    "",
    response_model=List[WorkspaceResponse],
    status_code=status.HTTP_200_OK,
    summary="List workspaces in an organization",
)
async def list_workspaces(
    org_id: uuid.UUID = Depends(get_org_uuid),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> List[WorkspaceResponse]:
    """
    Retrieve all workspaces belonging to the specified organization.
    """
    ws_service = WorkspaceService(db)
    workspaces = await ws_service.list_org_workspaces(
        user_id=current_user.id,
        organization_id=org_id,
    )
    return [WorkspaceResponse.model_validate(ws) for ws in workspaces]


@router.post(
    "",
    response_model=WorkspaceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new workspace",
)
async def create_workspace(
    payload: WorkspaceCreate,
    org_id: uuid.UUID = Depends(get_org_uuid),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> WorkspaceResponse:
    """
    Create a new workspace within an organization.
    Requires 'workspace:create' RBAC permission.
    """
    ws_service = WorkspaceService(db)
    workspace = await ws_service.create_workspace(
        user=current_user,
        organization_id=org_id,
        name=payload.name,
        description=payload.description,
    )
    return WorkspaceResponse.model_validate(workspace)


@router.get(
    "/{slug}/activity",
    response_model=List[ActivityLogResponse],
    status_code=status.HTTP_200_OK,
    summary="Get workspace activity timeline",
)
async def get_activity_timeline(
    slug: str,
    org_id: uuid.UUID = Depends(get_org_uuid),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> List[ActivityLogResponse]:
    """
    Retrieve paginated activity logs for a specific workspace.
    """
    ws_service = WorkspaceService(db)
    activities = await ws_service.get_workspace_activities(
        user_id=current_user.id,
        organization_id=org_id,
        workspace_slug=slug,
    )
    return [ActivityLogResponse.model_validate(act) for act in activities]
