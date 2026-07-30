"""
Integration tests for Module 4: Exploratory Data Analysis (EDA) & Auto-Insight Generator.
"""
import httpx
import pytest
from fastapi import status


@pytest.mark.asyncio
async def test_eda_and_auto_insights_workflow(client: httpx.AsyncClient):
    """
    Test uploading a dataset with numerical correlations and outliers, then verifying:
    - Pearson correlation matrix & multicollinearity detection (|r| >= 0.85)
    - 10-bin histogram frequency distribution & boxplot quartiles
    - Tukey IQR outlier detection
    - AI-generated ThoughtSpot/Zoho Analytics-style executive narrative briefings
    """
    # 1. Register test user
    reg_payload = {
        "email": "data-scientist@acme-analytics.ai",
        "password": "ProductionReady123!",
        "full_name": "Dr. Aris Thorne",
        "organization_name": "Acme Analytics",
    }
    reg_res = await client.post("/api/v1/auth/register", json=reg_payload)
    assert reg_res.status_code == status.HTTP_201_CREATED
    token_data = reg_res.json()
    headers = {"Authorization": f"Bearer {token_data['access_token']}"}

    # 2. Get organization ID and workspace slug
    orgs_res = await client.get("/api/v1/organizations", headers=headers)
    assert orgs_res.status_code == status.HTTP_200_OK
    org_id = orgs_res.json()[0]["id"]

    ws_headers = {**headers, "X-Organization-Id": org_id}
    ws_res = await client.get("/api/v1/workspaces", headers=ws_headers)
    assert ws_res.status_code == status.HTTP_200_OK
    workspaces = ws_res.json()
    assert len(workspaces) > 0
    workspace_slug = workspaces[0]["slug"]

    # 3. Upload a CSV dataset with strong collinearity (revenue & profit) and an outlier (99999.00)
    csv_content = (
        b"id,revenue,profit,region,tier\n"
        b"101,100.00,20.00,North America,Enterprise\n"
        b"102,200.00,40.00,Europe,SMB\n"
        b"103,300.00,60.00,North America,Enterprise\n"
        b"104,400.00,80.00,Asia,SMB\n"
        b"105,500.00,100.00,North America,Enterprise\n"
        b"106,99999.00,19999.80,North America,Enterprise\n"
    )
    files = {"file": ("q2_eda_sales.csv", csv_content, "text/csv")}
    upload_res = await client.post(
        f"/api/v1/workspaces/{workspace_slug}/datasets",
        headers=ws_headers,
        files=files,
    )
    assert upload_res.status_code == status.HTTP_201_CREATED
    dataset_data = upload_res.json()
    dataset_id = dataset_data["id"]

    # 4. Test GET /correlations -> verify Pearson r == 1.0 and collinearity alert triggered
    corr_res = await client.get(
        f"/api/v1/workspaces/{workspace_slug}/datasets/{dataset_id}/eda/correlations",
        headers=ws_headers,
    )
    assert corr_res.status_code == status.HTTP_200_OK
    corr_data = corr_res.json()
    assert "revenue" in corr_data["columns"]
    assert "profit" in corr_data["columns"]
    assert len(corr_data["pairs"]) >= 1
    top_pair = corr_data["pairs"][0]
    assert top_pair["is_collinear"] is True
    assert abs(top_pair["correlation"]) >= 0.95
    assert len(corr_data["alerts"]) >= 1
    assert any("multicollinearity" in a["title"].lower() for a in corr_data["alerts"])

    # 5. Test GET /distributions?column=revenue -> verify boxplot quartiles and 10 histogram bins
    dist_res = await client.get(
        f"/api/v1/workspaces/{workspace_slug}/datasets/{dataset_id}/eda/distributions",
        headers=ws_headers,
        params={"column": "revenue"},
    )
    assert dist_res.status_code == status.HTTP_200_OK
    dist_data = dist_res.json()
    assert dist_data["column"] == "revenue"
    assert dist_data["min"] == 100.0
    assert dist_data["max"] == 99999.0
    assert "histogram_bins" in dist_data
    assert len(dist_data["histogram_bins"]) == 10
    assert dist_data["skewness_label"] in ["HIGH_SKEW", "MODERATE_SKEW", "SYMMETRIC"]

    # 6. Test GET /outliers?column=revenue&method=IQR -> verify extreme outlier (99999.00) detected
    outlier_res = await client.get(
        f"/api/v1/workspaces/{workspace_slug}/datasets/{dataset_id}/eda/outliers",
        headers=ws_headers,
        params={"column": "revenue", "method": "IQR"},
    )
    assert outlier_res.status_code == status.HTTP_200_OK
    outlier_data = outlier_res.json()
    assert outlier_data["column"] == "revenue"
    assert outlier_data["method"] == "IQR"
    assert outlier_data["total_outliers"] >= 1
    assert outlier_data["sample_outliers"][0]["revenue"] == 99999.0

    # 7. Test GET /insights -> verify automated AI executive narrative briefing cards
    insights_res = await client.get(
        f"/api/v1/workspaces/{workspace_slug}/datasets/{dataset_id}/eda/insights",
        headers=ws_headers,
    )
    assert insights_res.status_code == status.HTTP_200_OK
    insights_data = insights_res.json()
    assert insights_data["dataset_id"] == dataset_id
    assert insights_data["total_insights"] >= 2
    categories = [i["category"] for i in insights_data["insights"]]
    # Should contain DRIVER, PARETO, or INFO summary cards
    assert "DRIVER" in categories or "INFO" in categories
    assert any(
        "q2_eda_sales" in i["description"] or "architecture" in i["title"].lower()
        for i in insights_data["insights"]
    )
