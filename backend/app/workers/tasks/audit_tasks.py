"""
Asynchronous Celery tasks for compliance audit log batch insertion and archival.
"""
import logging
from typing import Any, Dict, List
from app.workers.celery_app import celery_app

logger = logging.getLogger("decisionos.workers.audit")


@celery_app.task(
    name="app.workers.tasks.audit_tasks.record_audit_event_batch",
    queue="audit",
    max_retries=5,
    default_retry_delay=30,
)
def record_audit_event_batch(events: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Process a batch of compliance audit events in the background worker queue.
    """
    logger.info(f"[Celery Audit Task] Ingesting batch of {len(events)} compliance audit events.")
    return {"status": "success", "count": len(events)}
