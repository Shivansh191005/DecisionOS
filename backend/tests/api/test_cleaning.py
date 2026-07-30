"""
Integration tests for Module 3: Data Cleaning, Imputation & Feature Engineering Studio.
"""
import httpx
import pytest
from fastapi import status


@pytest.mark.asyncio
async def test_data_cleaning_studio_and_materialization_workflow(client: httpx.AsyncClient):
    """
    Test uploading a dataset with missing values, obtaining automated AI diagnostic
    recommendations, running DuckDB live previews with recipe steps applied,
    saving recipes, and materializing a clean dataset version.
    """
    # 1. Register test user
    reg_payload = {
        "email": "ml-engineer@acme-analytics.ai",
        "password": "ProductionReady123!",
        "full_name": "Marcus Vance",
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

    # 3. Upload a sample CSV dataset with missing values (nulls)
    csv_content = (
        b"id,revenue,region,tier\n"
        b"101,1500.50,North America,Enterprise\n"
        b"102,,Europe,SMB\n"
        b"103,2400.75,North America,Enterprise\n"
        b"104,450.25,,SMB\n"
        b"105,3100.00,North America,Enterprise\n"
    )
    files = {"file": ("q1_messy_sales.csv", csv_content, "text/csv")}
    upload_res = await client.post(
        f"/api/v1/workspaces/{workspace_slug}/datasets",
        headers=ws_headers,
        files=files,
    )
    assert upload_res.status_code == status.HTTP_201_CREATED
    dataset_data = upload_res.json()
    dataset_id = dataset_data["id"]

    # 4. Check automated AI diagnostic cleaning recommendations
    recs_res = await client.get(
        f"/api/v1/workspaces/{workspace_slug}/datasets/{dataset_id}/cleaning/recommendations",
        headers=ws_headers,
    )
    assert recs_res.status_code == status.HTTP_200_OK
    recommendations = recs_res.json()
    assert len(recommendations) >= 2  # should detect missing revenue and region
    assert any("revenue" in r["title"].lower() for r in recommendations)
    assert any("region" in r["title"].lower() for r in recommendations)

    # 5. Run live DuckDB vectorized cleaning preview
    steps = [
        {"type": "IMPUTE_NULL", "column": "revenue", "strategy": "MEAN"},
        {"type": "IMPUTE_NULL", "column": "region", "strategy": "CONSTANT", "value": "Unknown"},
        {"type": "DERIVED_COLUMN", "new_column": "profit", "formula": "revenue * 0.2"},
    ]
    preview_payload = {"steps": steps, "limit": 20, "offset": 0}
    preview_res = await client.post(
        f"/api/v1/workspaces/{workspace_slug}/datasets/{dataset_id}/cleaning/preview",
        headers=ws_headers,
        json=preview_payload,
    )
    assert preview_res.status_code == status.HTTP_200_OK
    preview_data = preview_res.json()
    assert preview_data["total_rows"] == 5
    assert "profit" in preview_data["columns"]
    # Ensure revenue was imputed (no None in revenue column)
    assert all(row["revenue"] is not None for row in preview_data["rows"])

    # 6. Save the cleaning recipe
    recipe_payload = {
        "name": "Q1 Revenue Clean & Profit Engineer",
        "description": "Impute missing revenue and calculate profit",
        "steps": steps,
    }
    recipe_res = await client.post(
        f"/api/v1/workspaces/{workspace_slug}/datasets/{dataset_id}/cleaning/recipes",
        headers=ws_headers,
        json=recipe_payload,
    )
    assert recipe_res.status_code == status.HTTP_201_CREATED
    saved_recipe = recipe_res.json()
    recipe_id = saved_recipe["id"]
    assert saved_recipe["name"] == "Q1 Revenue Clean & Profit Engineer"
    assert len(saved_recipe["steps"]) == 3

    # 7. List saved recipes for dataset
    list_res = await client.get(
        f"/api/v1/workspaces/{workspace_slug}/datasets/{dataset_id}/cleaning/recipes",
        headers=ws_headers,
    )
    assert list_res.status_code == status.HTTP_200_OK
    recipes_list = list_res.json()
    assert any(r["id"] == recipe_id for r in recipes_list)

    # 8. Commit & materialize the cleaned dataset version
    commit_payload = {
        "new_dataset_name": "q1_sales_cleaned",
        "steps": steps,
    }
    commit_res = await client.post(
        f"/api/v1/workspaces/{workspace_slug}/datasets/{dataset_id}/cleaning/commit",
        headers=ws_headers,
        json=commit_payload,
    )
    assert commit_res.status_code == status.HTTP_201_CREATED
    clean_ds = commit_res.json()
    assert clean_ds["name"] == "q1_sales_cleaned"
    assert clean_ds["status"] == "READY"
    assert clean_ds["row_count"] == 5
    assert clean_ds["column_count"] == 5  # id, revenue, region, tier, profit
