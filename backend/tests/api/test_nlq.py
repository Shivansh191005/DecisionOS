"""
Integration test suite for Module 6: NLQ-to-SQL (Natural Language to SQL Engine & AI Data Assistant).
"""
import io

import pytest
from httpx import AsyncClient

from app.core.exceptions import DecisionOSException
from app.services.nlq_service import NLQService


@pytest.mark.asyncio
async def test_nlq_and_bookmarks_workflow(client: AsyncClient) -> None:
    """
    Test NLQ-to-SQL query synthesis, chart recommendation, AST safety guard, and bookmark CRUD.
    """
    # 1. Register organization & user
    register_payload = {
        "email": "nlq_executive@decisionos.ai",
        "password": "SecurePassword123!",
        "full_name": "NLQ Executive User",
        "organization_name": "NLQ Decision Labs",
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
        "name": "NLQ Analytics Hub",
        "slug": "nlq-analytics-hub",
        "description": "Workspace for testing conversational SQL discovery",
    }
    ws_res = await client.post("/api/v1/workspaces", json=ws_payload, headers=headers)
    assert ws_res.status_code == 201, ws_res.text
    workspace_slug = ws_res.json()["slug"]

    # 3. Upload test CSV dataset
    csv_content = (
        "date,region,revenue,marketing_spend\n"
        "2025-01-01,North,12000.50,3000.00\n"
        "2025-01-02,South,15000.75,4000.00\n"
        "2025-02-01,North,18000.25,3500.00\n"
        "2025-02-02,South,21000.00,4500.00\n"
        "2025-03-01,East,11000.00,2500.00\n"
    ).encode("utf-8")

    files = {"file": ("nlq_sales.csv", io.BytesIO(csv_content), "text/csv")}
    upload_res = await client.post(
        f"/api/v1/workspaces/{workspace_slug}/datasets",
        headers=headers,
        files=files,
    )
    assert upload_res.status_code == 201, upload_res.text
    dataset_id = upload_res.json()["id"]

    # 4. Ask categorical question -> check BAR_CHART & SQL GROUP BY
    ask_payload_1 = {
        "question": "Show me total revenue by region sorted from highest to lowest"
    }
    ask_res_1 = await client.post(
        f"/api/v1/workspaces/{workspace_slug}/datasets/{dataset_id}/nlq/ask",
        headers=headers,
        json=ask_payload_1,
    )
    assert ask_res_1.status_code == 200, ask_res_1.text
    ask_data_1 = ask_res_1.json()
    assert ask_data_1["question"] == ask_payload_1["question"]
    assert "SELECT" in ask_data_1["generated_sql"].upper()
    assert "GROUP BY" in ask_data_1["generated_sql"].upper()
    assert ask_data_1["recommended_chart_type"] in ["BAR_CHART", "PIE_CHART"]
    assert len(ask_data_1["columns"]) == 2
    assert len(ask_data_1["rows"]) == 3
    assert "leading segment" in ask_data_1["ai_answer"] or "Categorical ranking" in ask_data_1["ai_answer"]

    # 5. Ask time-series question -> check LINE_CHART
    ask_payload_2 = {
        "question": "Monthly trend of revenue over time"
    }
    ask_res_2 = await client.post(
        f"/api/v1/workspaces/{workspace_slug}/datasets/{dataset_id}/nlq/ask",
        headers=headers,
        json=ask_payload_2,
    )
    assert ask_res_2.status_code == 200, ask_res_2.text
    ask_data_2 = ask_res_2.json()
    assert ask_data_2["recommended_chart_type"] == "LINE_CHART"
    assert "strftime" in ask_data_2["generated_sql"].lower() or "date_trunc" in ask_data_2["generated_sql"].lower()

    # 6. Ask KPI question -> check KPI_CARD
    ask_payload_3 = {
        "question": "What is the average revenue?"
    }
    ask_res_3 = await client.post(
        f"/api/v1/workspaces/{workspace_slug}/datasets/{dataset_id}/nlq/ask",
        headers=headers,
        json=ask_payload_3,
    )
    assert ask_res_3.status_code == 200, ask_res_3.text
    ask_data_3 = ask_res_3.json()
    assert ask_data_3["recommended_chart_type"] == "KPI_CARD"
    assert "AVG" in ask_data_3["generated_sql"].upper()

    # 7. Test SQL AST Safety Guard
    with pytest.raises(DecisionOSException) as exc_info:
        NLQService.validate_sql_safety("DELETE FROM datasets;")
    assert "UNSAFE_SQL_QUERY" in str(exc_info.value.error_code)

    with pytest.raises(DecisionOSException) as exc_info_2:
        NLQService.validate_sql_safety("SELECT * FROM datasets; DROP TABLE users;")
    assert "UNSAFE_SQL_QUERY" in str(exc_info_2.value.error_code)

    # 8. Test Bookmark CRUD
    bm_payload = {
        "question": "Total revenue by region",
        "generated_sql": ask_data_1["generated_sql"],
        "chart_type": ask_data_1["recommended_chart_type"],
    }
    create_bm_res = await client.post(
        f"/api/v1/workspaces/{workspace_slug}/datasets/{dataset_id}/nlq/bookmarks",
        headers=headers,
        json=bm_payload,
    )
    assert create_bm_res.status_code == 201, create_bm_res.text
    bm_data = create_bm_res.json()
    bookmark_id = bm_data["id"]
    assert bm_data["question"] == bm_payload["question"]
    assert bm_data["chart_type"] == bm_payload["chart_type"]

    # List bookmarks
    list_bm_res = await client.get(
        f"/api/v1/workspaces/{workspace_slug}/datasets/{dataset_id}/nlq/bookmarks",
        headers=headers,
    )
    assert list_bm_res.status_code == 200, list_bm_res.text
    bookmarks_list = list_bm_res.json()
    assert len(bookmarks_list) == 1
    assert bookmarks_list[0]["id"] == bookmark_id

    # Delete bookmark
    del_bm_res = await client.delete(
        f"/api/v1/workspaces/{workspace_slug}/datasets/{dataset_id}/nlq/bookmarks/{bookmark_id}",
        headers=headers,
    )
    assert del_bm_res.status_code == 204

    # Confirm deleted
    list_bm_res_2 = await client.get(
        f"/api/v1/workspaces/{workspace_slug}/datasets/{dataset_id}/nlq/bookmarks",
        headers=headers,
    )
    assert len(list_bm_res_2.json()) == 0
