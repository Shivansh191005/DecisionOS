"""
Authentication Service handling registration, login, token rotation, and Google OAuth.
"""
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import BadRequestException, ConflictException, UnauthorizedException
from app.core.security import (
    create_access_token,
    create_refresh_token,
    get_password_hash,
    hash_token,
    verify_password,
)
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.services.workspace_service import WorkspaceService


class AuthService:
    """Enterprise authentication service for DecisionOS."""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.user_repo = UserRepository(session)
        self.ws_service = WorkspaceService(session)

    async def register_user(
        self,
        email: str,
        password: str,
        full_name: str,
        organization_name: Optional[str] = None,
    ) -> Tuple[User, str, str]:
        """
        Register a new user, create their default Organization and Main Workspace,
        and return (user, access_token, refresh_token).
        """
        existing = await self.user_repo.get_by_email(email)
        if existing:
            raise ConflictException("An account with this email address already exists.")

        hashed_pw = get_password_hash(password)
        user = await self.user_repo.create(
            {
                "email": email.lower().strip(),
                "hashed_password": hashed_pw,
                "full_name": full_name.strip(),
                "is_active": True,
                "is_verified": False,
            }
        )

        # Automatically bootstrap organization & default workspace
        org_name = organization_name or f"{full_name}'s Organization"
        await self.ws_service.create_organization_with_default_workspace(user, org_name)

        access_token = create_access_token(subject=str(user.id))
        raw_refresh, token_hash, expires_at = create_refresh_token(subject=str(user.id))
        await self.user_repo.create_refresh_token(
            user_id=user.id, token_hash=token_hash, expires_at=expires_at
        )

        await self.session.commit()
        await self.session.refresh(user)
        return user, access_token, raw_refresh

    async def login(self, email: str, password: str) -> Tuple[User, str, str]:
        """
        Authenticate user credentials and issue access + refresh tokens.
        """
        user = await self.user_repo.get_by_email(email)
        if not user or not user.hashed_password:
            raise UnauthorizedException("Invalid email address or password.")

        if not verify_password(password, user.hashed_password):
            raise UnauthorizedException("Invalid email address or password.")

        if not user.is_active:
            raise UnauthorizedException("This account has been deactivated.")

        access_token = create_access_token(subject=str(user.id))
        raw_refresh, token_hash, expires_at = create_refresh_token(subject=str(user.id))
        await self.user_repo.create_refresh_token(
            user_id=user.id, token_hash=token_hash, expires_at=expires_at
        )

        await self.session.commit()
        return user, access_token, raw_refresh

    async def refresh_tokens(self, raw_refresh_token: str) -> Tuple[str, str]:
        """
        Rotate refresh token and issue a new access token.
        Revokes the used refresh token to prevent replay attacks.
        """
        token_hash = hash_token(raw_refresh_token)
        token_entry = await self.user_repo.get_refresh_token_by_hash(token_hash)
        if not token_entry or token_entry.is_revoked:
            raise UnauthorizedException("Refresh token is invalid or has been revoked.")

        now = datetime.now(timezone.utc)
        expires_at_dt = (
            token_entry.expires_at.replace(tzinfo=timezone.utc)
            if token_entry.expires_at.tzinfo is None
            else token_entry.expires_at
        )
        if expires_at_dt < now:
            token_entry.is_revoked = True
            await self.session.commit()
            raise UnauthorizedException("Refresh token has expired.")

        # Revoke old token
        token_entry.is_revoked = True

        # Create new token pair
        access_token = create_access_token(subject=str(token_entry.user_id))
        new_raw_refresh, new_token_hash, expires_at = create_refresh_token(
            subject=str(token_entry.user_id)
        )
        await self.user_repo.create_refresh_token(
            user_id=token_entry.user_id,
            token_hash=new_token_hash,
            expires_at=expires_at,
        )

        await self.session.commit()
        return access_token, new_raw_refresh

    async def logout(self, raw_refresh_token: str) -> bool:
        """Revoke a refresh token on user sign out."""
        token_hash = hash_token(raw_refresh_token)
        success = await self.user_repo.revoke_refresh_token(token_hash)
        await self.session.commit()
        return success

    async def authenticate_google(
        self, google_id: str, email: str, full_name: str, avatar_url: Optional[str] = None
    ) -> Tuple[User, str, str]:
        """
        SSO login or automatic account registration via Google OAuth.
        """
        user = await self.user_repo.get_by_google_id(google_id)
        if not user:
            # Check if email exists without Google ID linked
            user = await self.user_repo.get_by_email(email)
            if user:
                user.google_id = google_id
                if avatar_url and not user.avatar_url:
                    user.avatar_url = avatar_url
            else:
                user = await self.user_repo.create(
                    {
                        "email": email.lower().strip(),
                        "full_name": full_name.strip(),
                        "avatar_url": avatar_url,
                        "google_id": google_id,
                        "is_active": True,
                        "is_verified": True,
                    }
                )
                await self.ws_service.create_organization_with_default_workspace(
                    user, f"{full_name}'s Organization"
                )

        access_token = create_access_token(subject=str(user.id))
        raw_refresh, token_hash, expires_at = create_refresh_token(subject=str(user.id))
        await self.user_repo.create_refresh_token(
            user_id=user.id, token_hash=token_hash, expires_at=expires_at
        )

        await self.session.commit()
        await self.session.refresh(user)
        return user, access_token, raw_refresh
