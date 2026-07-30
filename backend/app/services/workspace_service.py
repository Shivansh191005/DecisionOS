"""
Workspace service for multi-tenant Organization and Workspace management in DecisionOS.
"""
import re
import uuid
from typing import Any, Dict, List, Optional, Sequence, Tuple

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestException, ConflictException, NotFoundException
from app.models.organization import Organization
from app.models.user import User
from app.models.workspace import Workspace
from app.repositories.org_repository import OrganizationRepository
from app.repositories.workspace_repository import WorkspaceRepository
from app.services.rbac_service import RBACService


def slugify(text: str) -> str:
    """Convert a display name into a clean URL-friendly slug."""
    slug = text.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_-]+", "-", slug)
    slug = re.sub(r"^-+|-+$", "", slug)
    return slug or "workspace"


class WorkspaceService:
    """Orchestrates Organization, Workspace, and Membership domain workflows."""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.org_repo = OrganizationRepository(session)
        self.ws_repo = WorkspaceRepository(session)
        self.rbac = RBACService(session)

    async def create_organization_with_default_workspace(
        self, user: User, org_name: str, plan: str = "enterprise"
    ) -> Tuple[Organization, Workspace]:
        """
        Create a new Organization, bootstrap default RBAC roles, assign user as Owner,
        and create the default Main Workspace.
        """
        base_slug = slugify(org_name)
        slug = base_slug
        counter = 1
        while await self.org_repo.get_by_slug(slug):
            slug = f"{base_slug}-{counter}"
            counter += 1

        # 1. Create organization
        org = await self.org_repo.create(
            {
                "name": org_name,
                "slug": slug,
                "plan": plan,
                "billing_email": user.email,
            }
        )

        # 2. Bootstrap system roles
        roles = await self.rbac.initialize_system_roles(org.id)
        owner_role = roles["owner"]

        # 3. Assign creator as Owner
        await self.org_repo.assign_user_role(
            user_id=user.id, organization_id=org.id, role_id=owner_role.id
        )

        # 4. Create default Main Workspace
        workspace = await self.ws_repo.create(
            {
                "organization_id": org.id,
                "name": "Main Workspace",
                "slug": "main",
                "description": "Default enterprise decision workspace",
                "is_default": True,
            }
        )

        # 5. Add user to workspace
        await self.ws_repo.add_workspace_member(workspace.id, user.id)

        # 6. Record audit & activity logs
        await self.ws_repo.create_audit_log(
            organization_id=org.id,
            user_id=user.id,
            action="organization.create",
            resource_type="Organization",
            resource_id=str(org.id),
            details={"org_slug": org.slug, "default_workspace": "main"},
        )
        await self.ws_repo.create_activity_log(
            workspace_id=workspace.id,
            user_id=user.id,
            action_type="workspace.init",
            description=f"Initialized default workspace for {org.name}",
        )

        await self.session.commit()
        await self.session.refresh(org)
        await self.session.refresh(workspace)
        return org, workspace

    async def list_user_organizations(self, user_id: uuid.UUID) -> Sequence[Organization]:
        """Return all organizations accessible to a user."""
        return await self.org_repo.get_user_organizations(user_id)

    async def list_org_workspaces(
        self, user_id: uuid.UUID, organization_id: uuid.UUID
    ) -> Sequence[Workspace]:
        """List all workspaces within an organization for an authorized member."""
        role = await self.org_repo.get_user_role_in_org(user_id, organization_id)
        if not role:
            raise NotFoundException("Organization not found or access denied.")
        return await self.ws_repo.get_org_workspaces(organization_id)

    async def create_workspace(
        self,
        user: User,
        organization_id: uuid.UUID,
        name: str,
        description: Optional[str] = None,
    ) -> Workspace:
        """Create a new workspace inside an organization after RBAC check."""
        await self.rbac.require_permission(user.id, organization_id, "workspace:create")

        slug = slugify(name)
        existing = await self.ws_repo.get_by_slug_in_org(organization_id, slug)
        if existing:
            raise ConflictException(f"Workspace with slug '{slug}' already exists.")

        workspace = await self.ws_repo.create(
            {
                "organization_id": organization_id,
                "name": name,
                "slug": slug,
                "description": description or "",
                "is_default": False,
            }
        )
        await self.ws_repo.add_workspace_member(workspace.id, user.id)

        await self.ws_repo.create_activity_log(
            workspace_id=workspace.id,
            user_id=user.id,
            action_type="workspace.create",
            description=f"Created workspace '{name}'",
        )
        await self.ws_repo.create_audit_log(
            organization_id=organization_id,
            user_id=user.id,
            action="workspace.create",
            resource_type="Workspace",
            resource_id=str(workspace.id),
            details={"workspace_slug": slug},
        )

        await self.session.commit()
        await self.session.refresh(workspace)
        return workspace

    async def get_workspace_by_slug(
        self, organization_id: uuid.UUID, slug: str
    ) -> Workspace:
        """Fetch a workspace by slug within an organization."""
        ws = await self.ws_repo.get_by_slug_in_org(organization_id, slug)
        if not ws:
            raise NotFoundException(f"Workspace '{slug}' not found.")
        return ws

    async def get_workspace_activities(
        self, user_id: uuid.UUID, organization_id: uuid.UUID, workspace_slug: str
    ) -> Sequence[Any]:
        """Fetch timeline of activity logs for a workspace."""
        await self.rbac.require_permission(user_id, organization_id, "workspace:read")
        ws = await self.ws_repo.get_by_slug_in_org(organization_id, workspace_slug)
        if not ws:
            raise NotFoundException(f"Workspace '{workspace_slug}' not found.")
        return await self.ws_repo.get_workspace_activities(ws.id)
