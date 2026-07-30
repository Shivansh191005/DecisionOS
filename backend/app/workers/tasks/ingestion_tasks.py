"""
Asynchronous Celery tasks for dataset schema profiling and metadata ingestion.
Runs in the background worker process without blocking API request threads.
"""
import asyncio
import logging
import uuid
from typing import Any, Dict

from app.db.session import async_session_maker
from app.models.dataset import DatasetStatus
from app.repositories.dataset_repository import DatasetRepository
from app.services.profiler_service import ProfilerService
from app.workers.celery_app import celery_app

logger = logging.getLogger("decisionos.workers.ingestion")


async def _process_dataset_async(dataset_id: uuid.UUID) -> Dict[str, Any]:
    """Async worker logic to profile dataset and update DB metadata."""
    async with async_session_maker() as session:
        repo = DatasetRepository(session)
        dataset = await repo.get_by_id(dataset_id)
        if not dataset:
            logger.error(f"[Celery Ingestion Task] Dataset {dataset_id} not found.")
            return {"status": "error", "message": "Dataset not found"}

        try:
            # Transition to PROCESSING
            dataset.status = DatasetStatus.PROCESSING.value
            await session.commit()

            # Execute automated schema inference & quality profiling
            profile_data = ProfilerService.profile_dataset(
                file_path=dataset.storage_path,
                file_type=dataset.file_type,
            )

            # Update dataset metadata with inferred schema and READY status
            dataset.row_count = profile_data.get("row_count", 0)
            dataset.column_count = profile_data.get("column_count", 0)
            dataset.schema_metadata = profile_data
            dataset.status = DatasetStatus.READY.value
            dataset.error_message = None

            await session.commit()
            logger.info(
                f"[Celery Ingestion Task] Successfully profiled dataset '{dataset.name}' ({dataset_id}): "
                f"{dataset.row_count} rows, {dataset.column_count} columns."
            )
            return {
                "status": "success",
                "dataset_id": str(dataset_id),
                "row_count": dataset.row_count,
                "column_count": dataset.column_count,
            }
        except Exception as e:
            logger.error(
                f"[Celery Ingestion Task] Error profiling dataset {dataset_id}: {str(e)}",
                exc_info=True,
            )
            dataset.status = DatasetStatus.ERROR.value
            dataset.error_message = str(e)
            await session.commit()
            return {"status": "error", "dataset_id": str(dataset_id), "message": str(e)}


@celery_app.task(
    name="app.workers.tasks.ingestion_tasks.process_dataset_ingestion",
    queue="default",
    max_retries=3,
    default_retry_delay=15,
)
def process_dataset_ingestion(dataset_id_str: str) -> Dict[str, Any]:
    """
    Celery task entrypoint to process dataset ingestion and schema profiling.
    """
    logger.info(f"[Celery Ingestion Task] Starting ingestion for dataset: {dataset_id_str}")
    dataset_id = uuid.UUID(dataset_id_str)
    return asyncio.run(_process_dataset_async(dataset_id))
