"""
User repository for database queries relating to User accounts and Refresh tokens.
"""
import uuid
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import RefreshToken, User
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    """User-specific repository operations."""

    def __init__(self, session: AsyncSession):
        super().__init__(User, session)

    async def get_by_email(self, email: str) -> Optional[User]:
        """Find an active user by email address (case-insensitive)."""
        result = await self.session.execute(
            select(User).where(User.email == email.lower())
        )
        return result.scalar_one_or_none()

    async def get_by_google_id(self, google_id: str) -> Optional[User]:
        """Find an active user by their Google OAuth ID."""
        result = await self.session.execute(
            select(User).where(User.google_id == google_id)
        )
        return result.scalar_one_or_none()

    async def create_refresh_token(
        self, user_id: uuid.UUID, token_hash: str, expires_at
    ) -> RefreshToken:
        """Store a new SHA-256 hashed refresh token in the database."""
        token_entry = RefreshToken(
            user_id=user_id,
            token_hash=token_hash,
            expires_at=expires_at,
            is_revoked=False,
        )
        self.session.add(token_entry)
        await self.session.flush()
        return token_entry

    async def get_refresh_token_by_hash(self, token_hash: str) -> Optional[RefreshToken]:
        """Retrieve a refresh token record by its SHA-256 hash."""
        result = await self.session.execute(
            select(RefreshToken).where(RefreshToken.token_hash == token_hash)
        )
        return result.scalar_one_or_none()

    async def revoke_refresh_token(self, token_hash: str) -> bool:
        """Revoke a refresh token so it cannot be used again."""
        token = await self.get_refresh_token_by_hash(token_hash)
        if not token:
            return False
        token.is_revoked = True
        await self.session.flush()
        return True
