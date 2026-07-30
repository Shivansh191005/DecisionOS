"""
Generic asynchronous SQLAlchemy repository pattern base class.
"""
import uuid
from typing import Any, Dict, Generic, List, Optional, Sequence, Type, TypeVar
from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import Base

ModelType = TypeVar("ModelType", bound=Base)


class BaseRepository(Generic[ModelType]):
    """Generic async repository providing CRUD operations for any ORM model."""

    def __init__(self, model: Type[ModelType], session: AsyncSession):
        self.model = model
        self.session = session

    async def get(self, id: uuid.UUID) -> Optional[ModelType]:
        """Fetch a single record by its UUID primary key."""
        result = await self.session.execute(
            select(self.model).where(self.model.id == id)  # type: ignore[attr-defined]
        )
        return result.scalar_one_or_none()

    async def get_all(
        self, skip: int = 0, limit: int = 100
    ) -> Sequence[ModelType]:
        """Fetch paginated sequence of records."""
        result = await self.session.execute(
            select(self.model).offset(skip).limit(limit)
        )
        return result.scalars().all()

    async def create(self, obj_in: Dict[str, Any]) -> ModelType:
        """Create and persist a new model instance."""
        db_obj = self.model(**obj_in)
        self.session.add(db_obj)
        await self.session.flush()
        await self.session.refresh(db_obj)
        return db_obj

    async def update(
        self, id: uuid.UUID, update_data: Dict[str, Any]
    ) -> Optional[ModelType]:
        """Update an existing record by UUID."""
        stmt = (
            update(self.model)
            .where(self.model.id == id)  # type: ignore[attr-defined]
            .values(**update_data)
            .returning(self.model)
        )
        result = await self.session.execute(stmt)
        await self.session.flush()
        return result.scalar_one_or_none()

    async def delete(self, id: uuid.UUID) -> bool:
        """Delete a record by UUID. Returns True if deleted, False if not found."""
        stmt = delete(self.model).where(self.model.id == id)  # type: ignore[attr-defined]
        result = await self.session.execute(stmt)
        await self.session.flush()
        return result.rowcount > 0
