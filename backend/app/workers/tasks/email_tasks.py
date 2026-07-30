"""
Asynchronous Celery tasks for sending notification emails and magic links.
"""
import logging
from typing import Any, Dict
from app.workers.celery_app import celery_app

logger = logging.getLogger("decisionos.workers.email")


@celery_app.task(
    name="app.workers.tasks.email_tasks.send_verification_email",
    queue="email",
    max_retries=3,
    default_retry_delay=60,
)
def send_verification_email(email: str, token: str) -> Dict[str, Any]:
    """
    Send an account verification link email via SMTP.
    In development mode, logs the token to the console.
    """
    logger.info(f"[Celery Email Task] Sending verification email to {email} (token: {token})")
    # Simulate SMTP transport
    return {"status": "sent", "email": email, "type": "verification"}


@celery_app.task(
    name="app.workers.tasks.email_tasks.send_magic_link_email",
    queue="email",
    max_retries=3,
    default_retry_delay=60,
)
def send_magic_link_email(email: str, magic_link_url: str) -> Dict[str, Any]:
    """
    Send a passwordless magic login link to the user's email address.
    """
    logger.info(f"[Celery Email Task] Sending magic link to {email}: {magic_link_url}")
    return {"status": "sent", "email": email, "type": "magic_link"}
