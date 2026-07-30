"""
Integration test suite for Module 8: Prescriptive Optimization & Goal-Seeking Engine.
"""
import io

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_prescriptive_optimization_workflow(client: AsyncClient) -> None:
    """
    Test Goal-Seeking and Constrained Resource Allocation solvers over DuckDB dataset.
    """
    # 1. Register organization & user
    register_payload = {
        "email": "opt_executive@decisionos.ai",
        "password": "SecurePassword123!",
        "full_name": "Optimization Executive",
        "organization_name": "Prescriptive Decision Labs",
    }
    reg_res = await client.post("/api/v1/auth/register", json=register_payload)
    assert reg_res.status_code == 201, reg_res.text
    auth_data = reg_res.json()
    token = auth_data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    orgs_res = await client.get("/api/v1/organizations", headers=headers)
    assert orgs_res.status_code == 200
    org_id = orgs_res.json()[0]["id"]
    headers["X-Organization-Id"] = org_id

    # 2. Create workspace
    ws_payload = {
        "name": "Optimization Studio Hub",
        "slug": "opt-studio-hub",
        "description": "Workspace for prescriptive optimization and Goal-Seeking",
    }
    ws_res = await client.post("/api/v1/workspaces", json=ws_payload, headers=headers)
    assert ws_res.status_code == 201, ws_res.text
    workspace_slug = ws_res.json()["slug"]

    # 3. Upload test CSV dataset
    csv_content = (
        "date,region,customer_tier,revenue,marketing_spend\n"
        "2025-01-01,North,Enterprise,12000.00,3000.00\n"
        "2025-01-02,South,Mid-Market,20000.00,4000.00\n"
        "2025-02-01,North,Enterprise,18000.00,3500.00\n"
        "2025-02-02,South,Enterprise,30000.00,5000.00\n"
        "2025-03-01,East,SMB,10000.00,2500.00\n"
    ).encode("utf-8")

    files = {"file": ("opt_sales.csv", io.BytesIO(csv_content), "text/csv")}
    upload_res = await client.post(
        f"/api/v1/workspaces/{workspace_slug}/datasets",
        headers=headers,
        files=files,
    )
    assert upload_res.status_code == 201, upload_res.text
    dataset_id = upload_res.json()["id"]

    # 4. Inspect Optimization Metadata
    meta_res = await client.get(
        f"/api/v1/workspaces/{workspace_slug}/datasets/{dataset_id}/optimization/metadata",
        headers=headers,
    )
    assert meta_res.status_code == 200, meta_res.text
    meta_data = meta_res.json()
    assert "revenue" in meta_data["numeric_columns"]
    assert "marketing_spend" in meta_data["numeric_columns"]
    assert "region" in meta_data["categorical_columns"]

    # 5. Solve Mode A: GOAL_SEEK
    goal_seek_payload = {
        "mode": "GOAL_SEEK",
        "target_column": "revenue",
        "constraint_column": "marketing_spend",
        "segment_column": "region",
        "target_goal_value": 110000.0,
        "max_adjustment_pct": 50.0,
    }
    gs_res = await client.post(
        f"/api/v1/workspaces/{workspace_slug}/datasets/{dataset_id}/optimization/solve",
        headers=headers,
        json=goal_seek_payload,
    )
    assert gs_res.status_code == 200, gs_res.text
    gs_data = gs_res.json()

    assert gs_data["mode"] == "GOAL_SEEK"
    assert gs_data["baseline_kpi_value"] > 0
    assert gs_data["optimized_kpi_value"] > gs_data["baseline_kpi_value"]
    assert gs_data["total_uplift_pct"] > 0
    assert len(gs_data["allocations"]) >= 1

    top_alloc = gs_data["allocations"][0]
    assert top_alloc["current_value"] > 0
    assert top_alloc["recommended_value"] > 0
    assert top_alloc["efficiency_roi"] > 0
    assert "AI Prescriptive Action Plan" in gs_data["ai_prescriptive_narrative"]

    # 6. Solve Mode B: RESOURCE_ALLOCATION
    res_alloc_payload = {
        "mode": "RESOURCE_ALLOCATION",
        "target_column": "revenue",
        "constraint_column": "marketing_spend",
        "segment_column": "region",
        "total_budget_constraint": 25000.0,
        "max_adjustment_pct": 50.0,
    }
    ra_res = await client.post(
        f"/api/v1/workspaces/{workspace_slug}/datasets/{dataset_id}/optimization/solve",
        headers=headers,
        json=res_alloc_payload,
    )
    assert ra_res.status_code == 200, ra_res.text
    ra_data = ra_res.json()

    assert ra_data["mode"] == "RESOURCE_ALLOCATION"
    assert ra_data["optimized_kpi_value"] > 0
    assert len(ra_data["allocations"]) >= 1
    assert "Constrained Resource Allocation" in ra_data["ai_prescriptive_narrative"]
