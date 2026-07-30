"""
Dataset Business Service for DecisionOS Module 2.
Coordinates multipart file upload saving, database record creation,
automated schema profiling, DuckDB OLAP previews/queries, and file deletion.
"""
import logging
import os
from typing import Any, Dict, List, Optional, Sequence
import uuid
import aiofiles
from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import DecisionOSException, NotFoundException
from app.models.dataset import Dataset, DatasetFileType, DatasetStatus
from app.models.user import User
from app.models.workspace import Workspace
from app.repositories.dataset_repository import DatasetRepository
from app.services.duckdb_engine import DuckDBEngine
from app.services.profiler_service import ProfilerService

logger = logging.getLogger("decisionos.services.dataset")


class DatasetService:
    """Enterprise dataset management service."""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.repo = DatasetRepository(session)

    @staticmethod
    def _detect_file_type(filename: str) -> str:
        """Detect supported file format from file extension."""
        ext = filename.lower().split(".")[-1] if "." in filename else "csv"
        if ext in ("xlsx", "xls"):
            return DatasetFileType.EXCEL.value
        elif ext == "json":
            return DatasetFileType.JSON.value
        elif ext == "parquet":
            return DatasetFileType.PARQUET.value
        else:
            return DatasetFileType.CSV.value

    async def upload_dataset(
        self,
        workspace: Workspace,
        user: User,
        file: UploadFile,
        dataset_name: Optional[str] = None,
        run_async: bool = True,
    ) -> Dataset:
        """
        Save uploaded file to tenant-isolated storage and trigger schema profiling.
        """
        if not file.filename:
            raise DecisionOSException(
                error_code="INVALID_FILE_UPLOAD",
                message="Uploaded file must have a valid filename.",
            )

        file_type = self._detect_file_type(file.filename)
        name = dataset_name.strip() if dataset_name else file.filename.rsplit(".", 1)[0]

        # Tenant-isolated storage directory: ./storage/datasets/{workspace_id}
        tenant_dir = os.path.join(settings.STORAGE_DIR, str(workspace.id))
        os.makedirs(tenant_dir, exist_ok=True)

        dataset_id = uuid.uuid4()
        ext = file.filename.rsplit(".", 1)[-1] if "." in file.filename else "csv"
        storage_path = os.path.abspath(os.path.join(tenant_dir, f"{dataset_id}.{ext}"))

        # Save uploaded file chunks to disk asynchronously
        total_bytes = 0
        try:
            async with aiofiles.open(storage_path, "wb") as out_file:
                while content := await file.read(1024 * 1024):  # 1MB chunks
                    await out_file.write(content)
                    total_bytes += len(content)
        except Exception as e:
            raise DecisionOSException(
                error_code="FILE_SAVE_FAILED",
                message=f"Failed to save uploaded dataset file: {str(e)}",
            )
        finally:
            await file.close()

        # Create database record
        dataset_data = {
            "id": dataset_id,
            "workspace_id": workspace.id,
            "name": name,
            "file_name": file.filename,
            "file_size_bytes": total_bytes,
            "file_type": file_type,
            "storage_path": storage_path,
            "status": DatasetStatus.UPLOADING.value,
        }
        dataset = await self.repo.create(dataset_data)

        # Profile dataset synchronously in test/dev mode for instant schema metadata
        try:
            dataset.status = DatasetStatus.PROCESSING.value
            await self.session.commit()

            profile_data = ProfilerService.profile_dataset(
                file_path=storage_path, file_type=file_type
            )
            dataset.row_count = profile_data.get("row_count", 0)
            dataset.column_count = profile_data.get("column_count", 0)
            dataset.schema_metadata = profile_data
            dataset.status = DatasetStatus.READY.value
            dataset.error_message = None
            await self.session.commit()
            await self.session.refresh(dataset)
        except Exception as e:
            logger.error(f"Error profiling dataset '{name}': {str(e)}", exc_info=True)
            dataset.status = DatasetStatus.ERROR.value
            dataset.error_message = str(e)
            await self.session.commit()
            await self.session.refresh(dataset)

        return dataset

    async def list_workspace_datasets(
        self, workspace_id: uuid.UUID, limit: int = 100, offset: int = 0
    ) -> Sequence[Dataset]:
        """List all datasets uploaded to a workspace."""
        return await self.repo.list_by_workspace(
            workspace_id=workspace_id, limit=limit, offset=offset
        )

    async def get_dataset(
        self, dataset_id: uuid.UUID, workspace_id: uuid.UUID
    ) -> Dataset:
        """Fetch a dataset by ID enforcing tenant workspace isolation."""
        dataset = await self.repo.get_by_id_and_workspace(
            dataset_id=dataset_id, workspace_id=workspace_id
        )
        if not dataset:
            raise NotFoundException(f"Dataset '{dataset_id}' not found.")
        return dataset

    async def preview_dataset(
        self,
        dataset: Dataset,
        limit: int = 50,
        offset: int = 0,
        sort_by: Optional[str] = None,
        sort_order: str = "asc",
    ) -> Dict[str, Any]:
        """
        Return a paginated data preview using the DuckDB OLAP engine.
        """
        if dataset.status != DatasetStatus.READY.value:
            raise DecisionOSException(
                error_code="DATASET_NOT_READY",
                message=f"Dataset is currently in status '{dataset.status}' and cannot be previewed.",
            )
        return DuckDBEngine.get_dataset_preview(
            file_path=dataset.storage_path,
            file_type=dataset.file_type,
            limit=limit,
            offset=offset,
            sort_by=sort_by,
            sort_order=sort_order,
        )

    async def query_dataset(
        self, dataset: Dataset, sql_query: str
    ) -> Dict[str, Any]:
        """
        Execute a safe analytical SQL query using the DuckDB OLAP engine.
        """
        if dataset.status != DatasetStatus.READY.value:
            raise DecisionOSException(
                error_code="DATASET_NOT_READY",
                message="Dataset is not in READY status.",
            )
        return DuckDBEngine.execute_analytical_query(
            file_path=dataset.storage_path,
            file_type=dataset.file_type,
            sql_query=sql_query,
        )

    async def delete_dataset(
        self, dataset_id: uuid.UUID, workspace_id: uuid.UUID
    ) -> bool:
        """
        Delete dataset record from DB and unlink file from disk storage.
        """
        dataset = await self.get_dataset(dataset_id=dataset_id, workspace_id=workspace_id)
        file_path = dataset.storage_path

        # Delete database record
        await self.repo.delete(dataset.id)
        await self.session.commit()

        # Remove file from disk
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except OSError as e:
                logger.warning(f"Failed to delete dataset file from disk: {file_path} - {e}")

        return True
