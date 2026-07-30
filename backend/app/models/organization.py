"""
Organization, Role, and RBAC mapping database models for multi-tenant DecisionOS.
"""
import uuid
from typing import Any, Dict, List, Optional
from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDModel


class Organization(UUIDModel, TimestampMixin):
    """Enterprise multi-tenant organization account."""

    __tablename__ = "organizations"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    plan: Mapped[str] = mapped_column(String(64), default="enterprise", nullable=False)
    billing_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Relationships
    roles: Mapped[List["Role"]] = relationship(
        "Role", back_populates="organization", cascade="all, delete-orphan"
    )
    user_roles: Mapped[List["UserOrganizationRole"]] = relationship(
        "UserOrganizationRole", back_populates="organization", cascade="all, delete-orphan"
    )
    workspaces: Mapped[List["Workspace"]] = relationship(
        "Workspace", back_populates="organization", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Organization id={self.id} slug={self.slug}>"


class Role(UUIDModel):
    """
    Granular role model holding an array/JSON of permission tags.
    System roles (Owner, Admin, Analyst, Viewer) are created automatically per Organization.
    """

    __tablename__ = "roles"

    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    permissions: Mapped[List[str]] = mapped_column(JSONB, default=list, nullable=False)
    is_system_role: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relationships
    organization: Mapped["Organization"] = relationship("Organization", back_populates="roles")
    user_assignments: Mapped[List["UserOrganizationRole"]] = relationship(
        "UserOrganizationRole", back_populates="role", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Role id={self.id} name={self.name} org={self.organization_id}>"


class UserOrganizationRole(Base):
    """
    Many-to-many mapping connecting Users to Organizations with a specific Role.
    """

    __tablename__ = "user_organization_roles"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        primary_key=True,
    )
    role_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("roles.id", ondelete="CASCADE"),
        nullable=False,
    )

    user: Mapped["User"] = relationship("User", back_populates="org_roles")
    organization: Mapped["Organization"] = relationship("Organization", back_populates="user_roles")
    role: Mapped["Role"] = relationship("Role", back_populates="user_assignments")

    def __repr__(self) -> str:
        return f"<UserOrganizationRole user={self.user_id} org={self.organization_id} role={self.role_id}>"
