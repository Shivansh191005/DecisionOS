"""
Integration tests for Module 2: Data Ingestion & Pipelines (DuckDB OLAP & Automated Schema Profiler).
"""
import httpx
import pytest
from fastapi import status


@pytest.mark.asyncio
async def test_dataset_ingestion_and_duckdb_olap_workflow(client: httpx.AsyncClient):
    """
    Test uploading a CSV dataset, checking automated schema quality scorecards,
    running DuckDB paginated previews, executing analytical aggregations, and deletion.
    """
    # 1. Register a test user
    reg_payload = {
        "email": "data-chief@acme-analytics.ai",
        "password": "ProductionReady123!",
        "full_name": "Elena Rostova",
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

    # 3. Upload a sample CSV dataset with numeric, categorical, and text data
    csv_content = (
        b"id,revenue,region,tier\n"
        b"101,1500.50,North America,Enterprise\n"
        b"102,820.00,Europe,SMB\n"
        b"103,2400.75,North America,Enterprise\n"
        b"104,450.25,Asia,SMB\n"
        b"105,3100.00,North America,Enterprise\n"
    )
    files = {"file": ("q1_sales_performance.csv", csv_content, "text/csv")}
    upload_res = await client.post(
        f"/api/v1/workspaces/{workspace_slug}/datasets",
        headers=ws_headers,
        files=files,
    )
    assert upload_res.status_code == status.HTTP_201_CREATED
    dataset_data = upload_res.json()
    dataset_id = dataset_data["id"]

    # Verify automated profiling metrics
    assert dataset_data["name"] == "q1_sales_performance"
    assert dataset_data["file_type"] == "CSV"
    assert dataset_data["status"] == "READY"
    assert dataset_data["row_count"] == 5
    assert dataset_data["column_count"] == 4

    schema = dataset_data["schema_metadata"]
    assert schema["row_count"] == 5
    assert len(schema["columns"]) == 4

    # Verify numeric column profile for 'revenue'
    rev_col = next(c for c in schema["columns"] if c["name"] == "revenue")
    assert rev_col["semantic_type"] == "NUMERIC"
    assert rev_col["min"] == 450.25
    assert rev_col["max"] == 3100.0
    assert "mean" in rev_col

    # 4. List workspace datasets
    list_res = await client.get(
        f"/api/v1/workspaces/{workspace_slug}/datasets",
        headers=ws_headers,
    )
    assert list_res.status_code == status.HTTP_200_OK
    list_data = list_res.json()
    assert len(list_data) == 1
    assert list_data[0]["id"] == dataset_id

    # 5. Fetch dataset details
    detail_res = await client.get(
        f"/api/v1/workspaces/{workspace_slug}/datasets/{dataset_id}",
        headers=ws_headers,
    )
    assert detail_res.status_code == status.HTTP_200_OK
    assert detail_res.json()["id"] == dataset_id

    # 6. Test DuckDB paginated data preview with sorting
    preview_res = await client.get(
        f"/api/v1/workspaces/{workspace_slug}/datasets/{dataset_id}/preview?limit=3&offset=0&sort_by=revenue&sort_order=desc",
        headers=ws_headers,
    )
    assert preview_res.status_code == status.HTTP_200_OK
    preview_data = preview_res.json()
    assert preview_data["total_rows"] == 5
    assert len(preview_data["rows"]) == 3
    # First row in DESC order should be max revenue 3100.00
    assert float(preview_data["rows"][0]["revenue"]) == 3100.00

    # 7. Test safe DuckDB analytical OLAP SQL aggregation query
    sql_payload = {
        "sql_query": (
            "SELECT region, COUNT(*) as tx_count, ROUND(AVG(revenue), 2) as avg_revenue "
            "FROM dataset GROUP BY 1 ORDER BY tx_count DESC"
        )
    }
    query_res = await client.post(
        f"/api/v1/workspaces/{workspace_slug}/datasets/{dataset_id}/query",
        headers=ws_headers,
        json=sql_payload,
    )
    assert query_res.status_code == status.HTTP_200_OK
    query_data = query_res.json()
    assert query_data["row_count"] == 3  # North America, Europe, Asia
    na_row = next(r for r in query_data["rows"] if r["region"] == "North America")
    assert na_row["tx_count"] == 3

    # 8. Test SQL injection / unsafe keyword prevention
    unsafe_payload = {"sql_query": "DROP TABLE dataset;"}
    unsafe_res = await client.post(
        f"/api/v1/workspaces/{workspace_slug}/datasets/{dataset_id}/query",
        headers=ws_headers,
        json=unsafe_payload,
    )
    assert unsafe_res.status_code == status.HTTP_400_BAD_REQUEST
    assert "forbidden keyword" in unsafe_res.json()["message"].lower()

    # 9. Test dataset deletion
    del_res = await client.delete(
        f"/api/v1/workspaces/{workspace_slug}/datasets/{dataset_id}",
        headers=ws_headers,
    )
    assert del_res.status_code == status.HTTP_204_NO_CONTENT

    # Verify dataset is removed
    get_after_del = await client.get(
        f"/api/v1/workspaces/{workspace_slug}/datasets/{dataset_id}",
        headers=ws_headers,
    )
    assert get_after_del.status_code == status.HTTP_404_NOT_FOUND
