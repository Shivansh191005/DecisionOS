"""
Repository pattern data access layer for CleaningRecipe domain model.
"""
import uuid
from typing import Any, Dict, List, Optional, Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cleaning import CleaningRecipe
from app.repositories.base import BaseRepository


class CleaningRecipeRepository(BaseRepository[CleaningRecipe]):
    """Tenant-isolated cleaning recipe repository operations."""

    def __init__(self, session: AsyncSession):
        super().__init__(CleaningRecipe, session)

    async def get_by_id_and_workspace(
        self, recipe_id: uuid.UUID, workspace_id: uuid.UUID
    ) -> Optional[CleaningRecipe]:
        """Fetch a cleaning recipe by ID within a specific workspace (tenant isolation)."""
        result = await self.session.execute(
            select(CleaningRecipe)
            .where(CleaningRecipe.id == recipe_id)
            .where(CleaningRecipe.workspace_id == workspace_id)
        )
        return result.scalar_one_or_none()

    async def list_by_dataset(
        self, dataset_id: uuid.UUID, workspace_id: uuid.UUID
    ) -> Sequence[CleaningRecipe]:
        """Fetch all cleaning recipes for a dataset ordered by created_at descending."""
        result = await self.session.execute(
            select(CleaningRecipe)
            .where(CleaningRecipe.dataset_id == dataset_id)
            .where(CleaningRecipe.workspace_id == workspace_id)
            .order_by(CleaningRecipe.created_at.desc())
        )
        return result.scalars().all()

    async def create_recipe(
        self,
        dataset_id: uuid.UUID,
        workspace_id: uuid.UUID,
        name: str,
        description: str,
        steps: List[Dict[str, Any]],
    ) -> CleaningRecipe:
        """Create and persist a new cleaning recipe."""
        recipe = CleaningRecipe(
            dataset_id=dataset_id,
            workspace_id=workspace_id,
            name=name,
            description=description,
            steps=steps,
        )
        self.session.add(recipe)
        await self.session.flush()
        return recipe

    async def update_recipe(
        self,
        recipe: CleaningRecipe,
        name: Optional[str] = None,
        description: Optional[str] = None,
        steps: Optional[List[Dict[str, Any]]] = None,
    ) -> CleaningRecipe:
        """Update an existing cleaning recipe."""
        if name is not None:
            recipe.name = name
        if description is not None:
            recipe.description = description
        if steps is not None:
            recipe.steps = steps
        await self.session.flush()
        return recipe
