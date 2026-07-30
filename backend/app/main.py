"""
DecisionOS — AI Decision Intelligence Platform
Main FastAPI application initialization, CORS middleware, and error handlers.
"""
from contextlib import asynccontextmanager
from typing import Any, Dict
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.exceptions import DecisionOSException
from app.db.base import Base
from app.db.session import engine
import app.models  # noqa: F401 - register models with SQLAlchemy metadata


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle event handler."""
    if settings.DATABASE_URL.startswith("sqlite"):
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="0.1.0",
    description=(
        "Enterprise AI Decision Intelligence Platform API. "
        "Provides authentication, multi-tenant organizations, workspaces, "
        "data ingestion, AI decision engines, and predictive analytics."
    ),
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Configure CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(DecisionOSException)
async def decisionos_exception_handler(
    request: Request, exc: DecisionOSException
) -> JSONResponse:
    """Global exception handler for DecisionOS domain exceptions."""
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"error_code": exc.error_code, "message": exc.message},
    )


# Include v1 REST API router
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/", tags=["System Health"], summary="Root API welcome")
async def root_index() -> Dict[str, Any]:
    """Root welcome endpoint."""
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "version": "0.1.0",
        "docs_url": "/docs",
        "api_v1_url": "/api/v1",
        "health_url": "/api/v1/health",
    }


@app.get("/api/v1", tags=["System Health"], summary="API v1 root")
async def api_v1_index() -> Dict[str, Any]:
    """API v1 root status endpoint."""
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "version": "0.1.0",
        "docs_url": "/docs",
        "endpoints": {
            "auth": "/api/v1/auth",
            "organizations": "/api/v1/organizations",
            "workspaces": "/api/v1/workspaces",
            "datasets": "/api/v1/workspaces/{workspace_slug}/datasets",
        },
    }


@app.get("/api/v1/health", tags=["System Health"], summary="API health check")
async def health_check() -> Dict[str, Any]:
    """
    Health check endpoint for Kubernetes, Docker, and Railway load balancer probes.
    """
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT,
        "version": "0.1.0",
    }
