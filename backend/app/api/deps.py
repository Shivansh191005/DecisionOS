"""
FastAPI dependency injection for authentication and RBAC authorization.
"""
import uuid
from typing import Optional
from fastapi import Depends, Header, Query
from fastapi.security import OAuth2PasswordBearer
import jwt
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import ForbiddenException, UnauthorizedException
from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.services.rbac_service import RBACService

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login",
    auto_error=False,
)


async def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Validate Bearer token from header and yield the authenticated User model.
    """
    if not token:
        raise UnauthorizedException("Not authenticated. Bearer token missing.")

    try:
        payload = decode_access_token(token)
        user_id_str: Optional[str] = payload.get("sub")
        if not user_id_str:
            raise UnauthorizedException("Token subject missing.")
        user_id = uuid.UUID(user_id_str)
    except (jwt.PyJWTError, ValueError) as exc:
        raise UnauthorizedException(f"Invalid authentication token: {exc}")

    user_repo = UserRepository(db)
    user = await user_repo.get(user_id)
    if not user:
        raise UnauthorizedException("User account not found.")

    if not user.is_active:
        raise UnauthorizedException("User account is deactivated.")

    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Ensure the authenticated user account is active."""
    if not current_user.is_active:
        raise UnauthorizedException("Inactive user account.")
    return current_user


class RequirePermission:
    """
    Dependency class checking if current user holds a required RBAC permission tag
    in the requested Organization (via header X-Organization-Id or query param organization_id).
    """

    def __init__(self, required_permission: str):
        self.required_permission = required_permission

    async def __call__(
        self,
        current_user: User = Depends(get_current_active_user),
        x_organization_id: Optional[str] = Header(None, alias="X-Organization-Id"),
        organization_id: Optional[str] = Query(None),
        db: AsyncSession = Depends(get_db),
    ) -> uuid.UUID:
        org_id_str = x_organization_id or organization_id
        if not org_id_str:
            raise ForbiddenException(
                "Organization context required (provide X-Organization-Id header or organization_id parameter)."
            )

        try:
            org_uuid = uuid.UUID(org_id_str)
        except ValueError:
            raise ForbiddenException("Invalid organization UUID format.")

        rbac_service = RBACService(db)
        await rbac_service.require_permission(
            user_id=current_user.id,
            organization_id=org_uuid,
            required_permission=self.required_permission,
        )
        return org_uuid
