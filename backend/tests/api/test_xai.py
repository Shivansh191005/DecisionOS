"""
Integration test suite for Module 7: Explainable AI & Driver Trees (Causal Attribution Engine & Root Cause Trees).
"""
import io

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_xai_driver_tree_workflow(client: AsyncClient) -> None:
    """
    Test XAI metadata discovery, hierarchical Driver Tree decomposition, and Shapley attribution.
    """
    # 1. Register organization & user
    register_payload = {
        "email": "xai_executive@decisionos.ai",
        "password": "SecurePassword123!",
        "full_name": "XAI Executive User",
        "organization_name": "XAI Decision Labs",
    }
    reg_res = await client.post("/api/v1/auth/register", json=register_payload)
    assert reg_res.status_code == 201, reg_res.text
    auth_data = reg_res.json()
    token = auth_data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Get organization ID for header
    orgs_res = await client.get("/api/v1/organizations", headers=headers)
    assert orgs_res.status_code == 200
    org_id = orgs_res.json()[0]["id"]
    headers["X-Organization-Id"] = org_id

    # 2. Create workspace
    ws_payload = {
        "name": "XAI Attribution Hub",
        "slug": "xai-attribution-hub",
        "description": "Workspace for testing Explainable AI and Driver Trees",
    }
    ws_res = await client.post("/api/v1/workspaces", json=ws_payload, headers=headers)
    assert ws_res.status_code == 201, ws_res.text
    workspace_slug = ws_res.json()["slug"]

    # 3. Upload test CSV dataset
    csv_content = (
        "date,region,customer_tier,revenue,marketing_spend\n"
        "2025-01-01,North,Enterprise,12000.50,3000.00\n"
        "2025-01-02,South,Mid-Market,15000.75,4000.00\n"
        "2025-02-01,North,Enterprise,18000.25,3500.00\n"
        "2025-02-02,South,Enterprise,21000.00,4500.00\n"
        "2025-03-01,East,SMB,11000.00,2500.00\n"
    ).encode("utf-8")

    files = {"file": ("xai_sales.csv", io.BytesIO(csv_content), "text/csv")}
    upload_res = await client.post(
        f"/api/v1/workspaces/{workspace_slug}/datasets",
        headers=headers,
        files=files,
    )
    assert upload_res.status_code == 201, upload_res.text
    dataset_id = upload_res.json()["id"]

    # 4. Inspect XAI metadata
    meta_res = await client.get(
        f"/api/v1/workspaces/{workspace_slug}/datasets/{dataset_id}/xai/metadata",
        headers=headers,
    )
    assert meta_res.status_code == 200, meta_res.text
    meta_data = meta_res.json()
    assert "revenue" in meta_data["numeric_columns"]
    assert "region" in meta_data["categorical_columns"]
    assert "customer_tier" in meta_data["categorical_columns"]

    # 5. Generate Driver Tree & Shapley Attribution
    tree_payload = {
        "target_column": "revenue",
        "driver_columns": ["region", "customer_tier"],
        "max_depth": 2,
        "top_k_branches": 3,
    }
    tree_res = await client.post(
        f"/api/v1/workspaces/{workspace_slug}/datasets/{dataset_id}/xai/driver-trees",
        headers=headers,
        json=tree_payload,
    )
    assert tree_res.status_code == 200, tree_res.text
    tree_data = tree_res.json()

    assert tree_data["target_column"] == "revenue"
    assert tree_data["total_kpi_value"] > 0
    assert tree_data["root_node"]["id"] == "root"
    assert tree_data["root_node"]["contribution_pct"] == 100.0
    assert len(tree_data["root_node"]["children"]) > 0

    # Verify first level children
    first_child = tree_data["root_node"]["children"][0]
    assert "region:" in first_child["name"] or "customer_tier:" in first_child["name"]
    assert first_child["contribution_pct"] > 0
    assert first_child["impact_direction"] in ["POSITIVE", "NEGATIVE", "NEUTRAL"]
    assert first_child["sensitivity_score"] > 0

    # Verify Shapley importance rankings
    rankings = tree_data["driver_rankings"]
    assert len(rankings) >= 1
    assert 0.0 <= rankings[0]["importance_score"] <= 100.0
    assert rankings[0]["direction"] in ["POSITIVE", "NEGATIVE"]

    # Verify AI Executive narrative
    assert "revenue" in tree_data["ai_narrative"]
    assert "What-If Elasticity" in tree_data["ai_narrative"] or "primary causal driver" in tree_data["ai_narrative"]
