"""
Integration test suite for Module 9: AI Executive Co-Pilot & Decision Briefing Generator.
"""
import io
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_executive_briefing_workflow(client: AsyncClient) -> None:
    """
    Test multi-module executive decision briefing synthesis, Markdown memo export,
    and interactive strategic Co-Pilot Q&A over DuckDB dataset.
    """
    # 1. Register organization & user
    register_payload = {
        "email": "briefing_exec@decisionos.ai",
        "password": "SecurePassword123!",
        "full_name": "Chief Decision Officer",
        "organization_name": "Executive Intelligence Corp",
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
        "name": "Executive Boardroom",
        "slug": "exec-boardroom",
        "description": "Workspace for C-Suite Strategic Briefings",
    }
    ws_res = await client.post("/api/v1/workspaces", json=ws_payload, headers=headers)
    assert ws_res.status_code == 201, ws_res.text
    workspace_slug = ws_res.json()["slug"]

    # 3. Upload test CSV dataset
    csv_content = (
        "date,region,customer_tier,revenue,marketing_spend\n"
        "2025-01-01,North,Enterprise,15000.00,3000.00\n"
        "2025-01-02,South,Mid-Market,22000.00,4000.00\n"
        "2025-02-01,North,Enterprise,19000.00,3500.00\n"
        "2025-02-02,South,Enterprise,31000.00,5000.00\n"
        "2025-03-01,East,SMB,11000.00,2500.00\n"
    ).encode("utf-8")

    files = {"file": ("briefing_sales.csv", io.BytesIO(csv_content), "text/csv")}
    upload_res = await client.post(
        f"/api/v1/workspaces/{workspace_slug}/datasets",
        headers=headers,
        files=files,
    )
    assert upload_res.status_code == 201, upload_res.text
    dataset_id = upload_res.json()["id"]

    # 4. Generate C-Suite Executive Decision Briefing
    briefing_payload = {
        "title": "Q1 C-Suite Performance Review",
        "target_column": "revenue",
        "include_forecasting": True,
        "include_xai": True,
        "include_optimization": True,
        "executive_notes": "Prioritize North sales expansion and audit SMB churn.",
    }
    brf_res = await client.post(
        f"/api/v1/workspaces/{workspace_slug}/datasets/{dataset_id}/briefing/generate",
        headers=headers,
        json=briefing_payload,
    )
    assert brf_res.status_code == 200, brf_res.text
    brf_data = brf_res.json()

    assert brf_data["title"] == "Q1 C-Suite Performance Review"
    assert brf_data["overall_health_score"] > 80.0
    assert len(brf_data["sections"]) == 5

    section_ids = [sec["section_id"] for sec in brf_data["sections"]]
    assert "DATA_HEALTH" in section_ids
    assert "EDA_STATS" in section_ids
    assert "FORECAST" in section_ids
    assert "XAI_ROOT_CAUSE" in section_ids
    assert "PRESCRIPTIVE_PLAN" in section_ids

    memo = brf_data["executive_memo_markdown"]
    assert "CONFIDENTIAL" in memo
    assert "Prioritize North sales expansion" in memo
    assert "Q1 C-Suite Performance Review" in memo

    # 5. Test Interactive Co-Pilot Strategic Q&A (Growth Driver)
    qna_growth_payload = {
        "question": "What is our primary growth driver?",
        "target_column": "revenue",
    }
    q1_res = await client.post(
        f"/api/v1/workspaces/{workspace_slug}/datasets/{dataset_id}/briefing/qna",
        headers=headers,
        json=qna_growth_payload,
    )
    assert q1_res.status_code == 200, q1_res.text
    q1_data = q1_res.json()
    assert "primary growth driver" in q1_data["answer_text"].lower()
    assert q1_data["confidence_score"] > 85.0

    # 6. Test Interactive Co-Pilot Strategic Q&A (Risk & Drag)
    qna_risk_payload = {
        "question": "What is our risk factor or drag?",
        "target_column": "revenue",
    }
    q2_res = await client.post(
        f"/api/v1/workspaces/{workspace_slug}/datasets/{dataset_id}/briefing/qna",
        headers=headers,
        json=qna_risk_payload,
    )
    assert q2_res.status_code == 200, q2_res.text
    q2_data = q2_res.json()
    assert "drag factor" in q2_data["answer_text"].lower()
    assert q2_data["confidence_score"] > 85.0
