"""
Organization repository for database operations on Organizations, Roles, and Membership.
"""
import uuid
from typing import List, Optional, Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.organization import Organization, Role, UserOrganizationRole
from app.repositories.base import BaseRepository


class OrganizationRepository(BaseRepository[Organization]):
    """Organization-specific repository operations."""

    def __init__(self, session: AsyncSession):
        super().__init__(Organization, session)

    async def get_by_slug(self, slug: str) -> Optional[Organization]:
        """Fetch an organization by its unique slug."""
        result = await self.session.execute(
            select(Organization).where(Organization.slug == slug)
        )
        return result.scalar_one_or_none()

    async def get_user_organizations(self, user_id: uuid.UUID) -> Sequence[Organization]:
        """Fetch all organizations a user belongs to."""
        result = await self.session.execute(
            select(Organization)
            .join(UserOrganizationRole, Organization.id == UserOrganizationRole.organization_id)
            .where(UserOrganizationRole.user_id == user_id)
        )
        return result.scalars().all()

    async def create_role(
        self,
        organization_id: uuid.UUID,
        name: str,
        permissions: List[str],
        is_system_role: bool = False,
    ) -> Role:
        """Create a Role within an organization."""
        role = Role(
            organization_id=organization_id,
            name=name,
            permissions=permissions,
            is_system_role=is_system_role,
        )
        self.session.add(role)
        await self.session.flush()
        return role

    async def get_role_by_name(
        self, organization_id: uuid.UUID, name: str
    ) -> Optional[Role]:
        """Find a role by name within an organization."""
        result = await self.session.execute(
            select(Role)
            .where(Role.organization_id == organization_id)
            .where(Role.name == name)
        )
        return result.scalar_one_or_none()

    async def assign_user_role(
        self, user_id: uuid.UUID, organization_id: uuid.UUID, role_id: uuid.UUID
    ) -> UserOrganizationRole:
        """Assign a user to an organization with a specific role."""
        mapping = UserOrganizationRole(
            user_id=user_id,
            organization_id=organization_id,
            role_id=role_id,
        )
        self.session.add(mapping)
        await self.session.flush()
        return mapping

    async def get_user_role_in_org(
        self, user_id: uuid.UUID, organization_id: uuid.UUID
    ) -> Optional[Role]:
        """Retrieve the role assigned to a user in an organization."""
        result = await self.session.execute(
            select(Role)
            .join(UserOrganizationRole, Role.id == UserOrganizationRole.role_id)
            .where(UserOrganizationRole.user_id == user_id)
            .where(UserOrganizationRole.organization_id == organization_id)
        )
        return result.scalar_one_or_none()
