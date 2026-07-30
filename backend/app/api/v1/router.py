"""
API v1 router combining all endpoint modules for DecisionOS.
"""
from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth,
    briefing,
    cleaning,
    datasets,
    eda,
    forecasting,
    nlq,
    optimization,
    organizations,
    users,
    workspaces,
    xai,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication & SSO"])
api_router.include_router(users.router, prefix="/users", tags=["User Account & Profile"])
api_router.include_router(
    organizations.router, prefix="/organizations", tags=["Organization Control Plane"]
)
api_router.include_router(
    workspaces.router, prefix="/workspaces", tags=["Multi-Tenant Workspaces"]
)
api_router.include_router(
    datasets.router,
    prefix="/workspaces/{workspace_slug}/datasets",
    tags=["Data Ingestion & DuckDB OLAP"],
)
api_router.include_router(
    cleaning.router,
    prefix="/workspaces/{workspace_slug}/datasets/{dataset_id}/cleaning",
    tags=["Data Cleaning & Feature Engineering"],
)
api_router.include_router(
    eda.router,
    prefix="/workspaces/{workspace_slug}/datasets/{dataset_id}/eda",
    tags=["Exploratory Data Analysis & AI Insights"],
)
api_router.include_router(
    forecasting.router,
    prefix="/workspaces/{workspace_slug}/datasets/{dataset_id}/forecasting",
    tags=["Time-Series Forecasting & What-If Scenarios"],
)
api_router.include_router(
    nlq.router,
    prefix="/workspaces/{workspace_slug}/datasets/{dataset_id}/nlq",
    tags=["NLQ-to-SQL & AI Ask Data Assistant"],
)
api_router.include_router(
    xai.router,
    prefix="/workspaces/{workspace_slug}/datasets/{dataset_id}/xai",
    tags=["Explainable AI & Driver Trees"],
)
api_router.include_router(
    optimization.router,
    prefix="/workspaces/{workspace_slug}/datasets/{dataset_id}/optimization",
    tags=["Prescriptive Optimization & Goal-Seeking"],
)
api_router.include_router(
    briefing.router,
    prefix="/workspaces/{workspace_slug}/datasets/{dataset_id}/briefing",
    tags=["AI Executive Co-Pilot & Decision Briefings"],
)




