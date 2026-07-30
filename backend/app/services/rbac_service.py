"""
RBAC Authorization Service for checking granular permission tags in DecisionOS.
"""
import uuid
from typing import Dict, List, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenException, NotFoundException
from app.models.organization import Role
from app.repositories.org_repository import OrganizationRepository

# Standard system roles initialized for every Organization
SYSTEM_ROLES: Dict[str, List[str]] = {
    "owner": ["*"],
    "admin": [
        "org:manage",
        "workspace:manage",
        "dataset:*",
        "dashboard:*",
        "ai:*",
        "simulation:*",
    ],
    "analyst": [
        "dataset:write",
        "dataset:read",
        "dashboard:write",
        "dashboard:read",
        "ai:query",
        "simulation:run",
    ],
    "viewer": [
        "dataset:read",
        "dashboard:read",
        "ai:read",
    ],
}


class RBACService:
    """Service handling RBAC permission checks and system role bootstrapping."""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.org_repo = OrganizationRepository(session)

    async def initialize_system_roles(self, organization_id: uuid.UUID) -> Dict[str, Role]:
        """
        Bootstrap default system roles (owner, admin, analyst, viewer) for an organization.
        Returns a dict mapping role name to Role ORM object.
        """
        created_roles: Dict[str, Role] = {}
        for name, perms in SYSTEM_ROLES.items():
            role = await self.org_repo.create_role(
                organization_id=organization_id,
                name=name,
                permissions=perms,
                is_system_role=True,
            )
            created_roles[name] = role
        return created_roles

    async def has_permission(
        self, user_id: uuid.UUID, organization_id: uuid.UUID, required_permission: str
    ) -> bool:
        """
        Check if a user has a required permission in an organization.
        Supports wildcard matching (e.g., '*' or 'dataset:*').
        """
        role = await self.org_repo.get_user_role_in_org(user_id, organization_id)
        if not role:
            return False

        perms = role.permissions
        if "*" in perms:
            return True

        if required_permission in perms:
            return True

        # Check domain wildcard e.g., 'dataset:*' matches 'dataset:write'
        domain = required_permission.split(":")[0]
        if f"{domain}:*" in perms:
            return True

        return False

    async def require_permission(
        self, user_id: uuid.UUID, organization_id: uuid.UUID, required_permission: str
    ) -> None:
        """
        Raise ForbiddenException if the user does not have the required permission.
        """
        if not await self.has_permission(user_id, organization_id, required_permission):
            raise ForbiddenException(
                f"Required permission '{required_permission}' missing for this organization."
            )
