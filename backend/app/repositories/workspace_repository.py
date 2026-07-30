"""
Workspace repository for querying workspaces, member assignments, and activity logs.
"""
import uuid
from typing import Any, Dict, Optional, Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.audit import ActivityLog, AuditLog
from app.models.workspace import Workspace, WorkspaceMember
from app.repositories.base import BaseRepository


class WorkspaceRepository(BaseRepository[Workspace]):
    """Workspace-specific repository operations."""

    def __init__(self, session: AsyncSession):
        super().__init__(Workspace, session)

    async def get_by_slug_in_org(
        self, organization_id: uuid.UUID, slug: str
    ) -> Optional[Workspace]:
        """Find a workspace by slug within a specific organization."""
        result = await self.session.execute(
            select(Workspace)
            .where(Workspace.organization_id == organization_id)
            .where(Workspace.slug == slug)
        )
        return result.scalar_one_or_none()

    async def get_org_workspaces(
        self, organization_id: uuid.UUID
    ) -> Sequence[Workspace]:
        """Fetch all workspaces belonging to an organization."""
        result = await self.session.execute(
            select(Workspace)
            .where(Workspace.organization_id == organization_id)
            .order_by(Workspace.created_at.desc())
        )
        return result.scalars().all()

    async def add_workspace_member(
        self, workspace_id: uuid.UUID, user_id: uuid.UUID
    ) -> WorkspaceMember:
        """Add a user as a member of a workspace."""
        member = WorkspaceMember(workspace_id=workspace_id, user_id=user_id)
        self.session.add(member)
        await self.session.flush()
        return member

    async def get_workspace_member(
        self, workspace_id: uuid.UUID, user_id: uuid.UUID
    ) -> Optional[WorkspaceMember]:
        """Check if a user is a member of a workspace."""
        result = await self.session.execute(
            select(WorkspaceMember)
            .where(WorkspaceMember.workspace_id == workspace_id)
            .where(WorkspaceMember.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def create_activity_log(
        self,
        workspace_id: uuid.UUID,
        user_id: Optional[uuid.UUID],
        action_type: str,
        description: str,
        metadata_json: Optional[Dict[str, Any]] = None,
    ) -> ActivityLog:
        """Append an activity log entry to a workspace timeline."""
        log = ActivityLog(
            workspace_id=workspace_id,
            user_id=user_id,
            action_type=action_type,
            description=description,
            metadata_json=metadata_json or {},
        )
        self.session.add(log)
        await self.session.flush()
        return log

    async def get_workspace_activities(
        self, workspace_id: uuid.UUID, limit: int = 50
    ) -> Sequence[ActivityLog]:
        """Retrieve recent activity timeline for a workspace."""
        result = await self.session.execute(
            select(ActivityLog)
            .where(ActivityLog.workspace_id == workspace_id)
            .order_by(ActivityLog.created_at.desc())
            .limit(limit)
        )
        return result.scalars().all()

    async def create_audit_log(
        self,
        organization_id: Optional[uuid.UUID],
        user_id: Optional[uuid.UUID],
        action: str,
        resource_type: str,
        resource_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ) -> AuditLog:
        """Create an immutable compliance audit log entry."""
        log = AuditLog(
            organization_id=organization_id,
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            ip_address=ip_address,
            user_agent=user_agent,
            details=details or {},
        )
        self.session.add(log)
        await self.session.flush()
        return log
