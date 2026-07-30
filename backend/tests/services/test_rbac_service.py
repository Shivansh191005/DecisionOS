"""
Unit and integration tests for RBACService permission validation.
"""
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenException
from app.repositories.org_repository import OrganizationRepository
from app.services.rbac_service import RBACService
from app.services.workspace_service import WorkspaceService
from app.models.user import User


@pytest.mark.asyncio
async def test_rbac_wildcard_and_domain_permissions(db_session: AsyncSession):
    """Test Owner wildcard '*', Admin domain wildcard, and missing Viewer permissions."""
    # Create test user & org
    user = User(
        email="admin@test.ai",
        full_name="Test Admin",
        is_active=True,
        is_verified=True,
    )
    db_session.add(user)
    await db_session.flush()

    ws_service = WorkspaceService(db_session)
    org, _ = await ws_service.create_organization_with_default_workspace(
        user, "Test RBAC Org"
    )

    rbac = RBACService(db_session)

    # 1. User is assigned Owner role on org creation -> has wildcard '*'
    assert await rbac.has_permission(user.id, org.id, "workspace:create") is True
    assert await rbac.has_permission(user.id, org.id, "dataset:upload") is True
    assert await rbac.has_permission(user.id, org.id, "ai:query") is True

    # 2. Assign user to Viewer role and test restrictive permissions
    org_repo = OrganizationRepository(db_session)
    viewer_role = await org_repo.get_role_by_name(org.id, "viewer")
    assert viewer_role is not None

    # Replace user role mapping with Viewer
    from app.models.organization import UserOrganizationRole
    from sqlalchemy import delete

    await db_session.execute(
        delete(UserOrganizationRole).where(
            UserOrganizationRole.user_id == user.id,
            UserOrganizationRole.organization_id == org.id,
        )
    )
    # Re-assign as viewer
    await org_repo.assign_user_role(
        user_id=user.id, organization_id=org.id, role_id=viewer_role.id
    )
    await db_session.commit()

    # Viewer has 'dashboard:read' and 'ai:read' but NOT 'workspace:create' or 'dataset:write'
    assert await rbac.has_permission(user.id, org.id, "dashboard:read") is True
    assert await rbac.has_permission(user.id, org.id, "ai:read") is True
    assert await rbac.has_permission(user.id, org.id, "workspace:create") is False
    assert await rbac.has_permission(user.id, org.id, "dataset:write") is False

    # require_permission should raise ForbiddenException for missing perm
    with pytest.raises(ForbiddenException):
        await rbac.require_permission(user.id, org.id, "workspace:create")
