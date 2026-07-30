"""
Dataset Repository for querying, creating, and updating dataset metadata.
All queries are scoped by workspace_id to enforce multi-tenant isolation.
"""
import uuid
from typing import Any, Dict, Optional, Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.dataset import Dataset, DatasetStatus
from app.repositories.base import BaseRepository


class DatasetRepository(BaseRepository[Dataset]):
    """Tenant-isolated dataset repository operations."""

    def __init__(self, session: AsyncSession):
        super().__init__(Dataset, session)

    async def get_by_id_and_workspace(
        self, dataset_id: uuid.UUID, workspace_id: uuid.UUID
    ) -> Optional[Dataset]:
        """Fetch a dataset by ID within a specific workspace (tenant isolation)."""
        result = await self.session.execute(
            select(Dataset)
            .where(Dataset.id == dataset_id)
            .where(Dataset.workspace_id == workspace_id)
        )
        return result.scalar_one_or_none()

    async def list_by_workspace(
        self, workspace_id: uuid.UUID, limit: int = 100, offset: int = 0
    ) -> Sequence[Dataset]:
        """Fetch all datasets in a workspace ordered by creation date descending."""
        result = await self.session.execute(
            select(Dataset)
            .where(Dataset.workspace_id == workspace_id)
            .order_by(Dataset.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return result.scalars().all()

    async def update_status_and_metadata(
        self,
        dataset_id: uuid.UUID,
        status: str,
        row_count: Optional[int] = None,
        column_count: Optional[int] = None,
        schema_metadata: Optional[Dict[str, Any]] = None,
        error_message: Optional[str] = None,
    ) -> Optional[Dataset]:
        """Update dataset ingestion status and inferred schema statistics."""
        dataset = await self.get_by_id(dataset_id)
        if not dataset:
            return None

        dataset.status = status
        if row_count is not None:
            dataset.row_count = row_count
        if column_count is not None:
            dataset.column_count = column_count
        if schema_metadata is not None:
            dataset.schema_metadata = schema_metadata
        if error_message is not None:
            dataset.error_message = error_message

        await self.session.flush()
        return dataset
