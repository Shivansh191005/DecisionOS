"""
Celery configuration for DecisionOS background task workers.
Configures Redis broker, JSON serializer, and dedicated task queues.
"""
from celery import Celery
from kombu import Exchange, Queue

from app.core.config import settings

celery_app = Celery(
    "decisionos_worker",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

# Define exchange and dedicated task queues
default_exchange = Exchange("default", type="direct")
email_exchange = Exchange("email", type="direct")
audit_exchange = Exchange("audit", type="direct")
ml_exchange = Exchange("ml", type="direct")

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=3600,  # 1 hour max for long ML jobs
    task_soft_time_limit=3000,
    worker_prefetch_multiplier=1,
    task_queues=[
        Queue("default", default_exchange, routing_key="default"),
        Queue("email", email_exchange, routing_key="email.#"),
        Queue("audit", audit_exchange, routing_key="audit.#"),
        Queue("ml_training", ml_exchange, routing_key="ml.training.#"),
        Queue("ml_inference", ml_exchange, routing_key="ml.inference.#"),
        Queue("reports", default_exchange, routing_key="reports.#"),
    ],
    task_default_queue="default",
    task_default_exchange="default",
    task_default_routing_key="default",
)

# Autodiscover tasks from task modules
celery_app.autodiscover_tasks(
    [
        "app.workers.tasks.email_tasks",
        "app.workers.tasks.audit_tasks",
    ]
)
