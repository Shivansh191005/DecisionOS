"""
DecisionOS Application Settings & Environment Variables.
Uses Pydantic v2 BaseSettings for type-safe environment configuration.
"""
from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Production application settings loaded from environment variables."""

    # Project info
    PROJECT_NAME: str = "DecisionOS"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    API_V1_STR: str = "/api/v1"

    # Security & Authentication
    SECRET_KEY: str = "supersecret-decisionos-dev-secret-key-change-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ALGORITHM: str = "HS256"

    # Google OAuth
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:3000/api/auth/callback/google"

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:8000",
        "http://localhost:80",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8000",
    ]

    # Database URLs (defaults to local SQLite if PostgreSQL is not configured via env)
    DATABASE_URL: str = "sqlite+aiosqlite:///./decisionos_local.db"
    SYNC_DATABASE_URL: str = "sqlite:///./decisionos_local.db"

    # Redis & Celery
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    # Email / SMTP
    EMAIL_SENDER_NAME: str = "DecisionOS Security"
    EMAIL_SENDER_ADDRESS: str = "noreply@decisionos.ai"
    SMTP_HOST: str = "smtp.mailtrap.io"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""

    # AI & ML
    OPENAI_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    GROQ_API_KEY: str = ""

    # Data Storage & Ingestion
    STORAGE_DIR: str = "./storage/datasets"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    """Return cached application settings singleton."""
    return Settings()


settings = get_settings()
