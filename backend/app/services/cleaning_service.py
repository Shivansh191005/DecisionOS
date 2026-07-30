"""
Business logic service for Data Cleaning, Imputation & Feature Engineering Studio.
"""
import os
from typing import Any, Dict, List, Optional, Sequence
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import DecisionOSException, NotFoundException
from app.models.cleaning import CleaningRecipe
from app.models.dataset import Dataset, DatasetFileType, DatasetStatus
from app.repositories.cleaning_repository import CleaningRecipeRepository
from app.repositories.dataset_repository import DatasetRepository
from app.services.duckdb_engine import DuckDBEngine
from app.services.profiler_service import ProfilerService


class CleaningService:
    """Service layer for non-destructive data cleaning recipes and AI diagnostics."""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.recipe_repo = CleaningRecipeRepository(session)
        self.dataset_repo = DatasetRepository(session)

    async def list_recipes(
        self, dataset_id: uuid.UUID, workspace_id: uuid.UUID
    ) -> Sequence[CleaningRecipe]:
        """List all saved cleaning recipes for a dataset."""
        return await self.recipe_repo.list_by_dataset(
            dataset_id=dataset_id, workspace_id=workspace_id
        )

    async def get_recipe(
        self, recipe_id: uuid.UUID, workspace_id: uuid.UUID
    ) -> CleaningRecipe:
        """Fetch a specific cleaning recipe by ID and workspace."""
        recipe = await self.recipe_repo.get_by_id_and_workspace(
            recipe_id=recipe_id, workspace_id=workspace_id
        )
        if not recipe:
            raise NotFoundException(f"Cleaning Recipe '{recipe_id}' not found.")
        return recipe

    async def create_recipe(
        self,
        dataset_id: uuid.UUID,
        workspace_id: uuid.UUID,
        name: str,
        description: str,
        steps: List[Dict[str, Any]],
    ) -> CleaningRecipe:
        """Create and save a new cleaning recipe."""
        recipe = await self.recipe_repo.create_recipe(
            dataset_id=dataset_id,
            workspace_id=workspace_id,
            name=name,
            description=description,
            steps=steps,
        )
        await self.session.commit()
        await self.session.refresh(recipe)
        return recipe

    async def delete_recipe(
        self, recipe_id: uuid.UUID, workspace_id: uuid.UUID
    ) -> None:
        """Delete a cleaning recipe by ID."""
        recipe = await self.get_recipe(recipe_id, workspace_id)
        await self.recipe_repo.delete(recipe.id)
        await self.session.commit()

    def _extract_column_names(self, dataset: Dataset) -> List[str]:
        """Extract column names from dataset schema metadata."""
        cols = []
        schema = dataset.schema_metadata or {}
        columns_list = schema.get("columns", [])
        for col_def in columns_list:
            c_name = col_def.get("name")
            if c_name:
                cols.append(c_name)
        return cols

    async def preview_recipe(
        self,
        dataset: Dataset,
        steps: List[Dict[str, Any]],
        limit: int = 50,
        offset: int = 0,
    ) -> Dict[str, Any]:
        """
        Execute DuckDB live preview of the dataset WITH the recipe steps applied.
        """
        columns = self._extract_column_names(dataset)
        return DuckDBEngine.preview_cleaned_dataset(
            file_path=dataset.storage_path,
            file_type=dataset.file_type,
            columns=columns,
            steps=steps,
            limit=limit,
            offset=offset,
        )

    async def get_recommendations(self, dataset: Dataset) -> List[Dict[str, Any]]:
        """
        Scan dataset schema scorecard and return automated AI diagnostic recommendations.
        """
        recommendations = []
        schema = dataset.schema_metadata or {}
        columns_list = schema.get("columns", [])

        for col_def in columns_list:
            col_name = col_def.get("name")
            if not col_name:
                continue

            semantic_type = col_def.get("semantic_type", "TEXT")
            null_pct = col_def.get("null_percentage", 0.0)
            null_cnt = col_def.get("null_count", 0)
            unique_cnt = col_def.get("unique_count", 0)

            # 1. Check for missing values
            if null_cnt > 0 or null_pct > 0.0:
                if semantic_type == "NUMERIC":
                    recommendations.append(
                        {
                            "id": f"rec_{col_name}_impute_mean",
                            "title": f"Impute Missing '{col_name}' with Mean",
                            "reason": f"Column has {null_pct:.1f}% ({null_cnt}) missing values. Average imputation preserves distribution center.",
                            "severity": "WARNING",
                            "step": {
                                "type": "IMPUTE_NULL",
                                "column": col_name,
                                "strategy": "MEAN",
                            },
                        }
                    )
                else:
                    recommendations.append(
                        {
                            "id": f"rec_{col_name}_impute_unknown",
                            "title": f"Fill Missing '{col_name}' with 'Unknown'",
                            "reason": f"Categorical column has {null_pct:.1f}% ({null_cnt}) missing values.",
                            "severity": "WARNING",
                            "step": {
                                "type": "IMPUTE_NULL",
                                "column": col_name,
                                "strategy": "CONSTANT",
                                "value": "Unknown",
                            },
                        }
                    )

            # 2. Check for constant / zero-variance columns (cardinality == 1)
            if unique_cnt == 1 and col_def.get("total_rows", 10) > 1:
                recommendations.append(
                    {
                        "id": f"rec_{col_name}_drop_constant",
                        "title": f"Drop Constant Column '{col_name}'",
                        "reason": f"Column has only 1 unique value across all rows and provides zero analytical variance.",
                        "severity": "INFO",
                        "step": {
                            "type": "DROP_COLUMN",
                            "column": col_name,
                        },
                    }
                )

        return recommendations

    async def commit_recipe(
        self,
        dataset: Dataset,
        workspace_id: uuid.UUID,
        new_dataset_name: str,
        steps: List[Dict[str, Any]],
    ) -> Dataset:
        """
        Materialize the cleaned transformation recipe as a brand new versioned Dataset in the workspace.
        """
        columns = self._extract_column_names(dataset)
        new_dataset_id = uuid.uuid4()
        dest_filename = f"{new_dataset_id}.csv"
        dest_path = os.path.abspath(
            os.path.join(settings.STORAGE_DIR, str(workspace_id), dest_filename)
        )

        # 1. Execute DuckDB materialization to export cleaned CSV
        rows_exported = DuckDBEngine.materialize_cleaned_dataset(
            file_path=dataset.storage_path,
            file_type=dataset.file_type,
            dest_path=dest_path,
            columns=columns,
            steps=steps,
        )

        # 2. Profile the new clean dataset file
        profile_metadata = ProfilerService.profile_dataset(
            file_path=dest_path, file_type=DatasetFileType.CSV.value
        )

        file_size = os.path.getsize(dest_path) if os.path.exists(dest_path) else 0

        # 3. Create new Dataset domain record
        new_dataset = Dataset(
            id=new_dataset_id,
            workspace_id=workspace_id,
            name=new_dataset_name,
            file_name=f"{new_dataset_name}.csv",
            file_size_bytes=file_size,
            file_type=DatasetFileType.CSV.value,
            storage_path=dest_path,
            row_count=profile_metadata.get("row_count", rows_exported),
            column_count=profile_metadata.get("column_count", 0),
            schema_metadata=profile_metadata,
            status=DatasetStatus.READY.value,
        )

        self.session.add(new_dataset)
        await self.session.commit()
        await self.session.refresh(new_dataset)

        return new_dataset
