"""
Integration tests for organizations and workspaces endpoints (/api/v1/organizations & /api/v1/workspaces).
"""
import pytest
import httpx
from fastapi import status


@pytest.mark.asyncio
async def test_organization_and_workspace_workflows(client: httpx.AsyncClient):
    """Test org listing, default workspace verification, and new workspace creation."""
    # 1. Register a user to automatically initialize their default Org and Workspace
    reg_payload = {
        "email": "cto@acme-corp.ai",
        "password": "ProductionReady123!",
        "full_name": "Marcus Vance",
        "organization_name": "Acme Intelligence",
    }
    reg_res = await client.post("/api/v1/auth/register", json=reg_payload)
    assert reg_res.status_code == status.HTTP_201_CREATED
    token_data = reg_res.json()
    headers = {"Authorization": f"Bearer {token_data['access_token']}"}

    # 2. List organizations
    orgs_res = await client.get("/api/v1/organizations", headers=headers)
    assert orgs_res.status_code == status.HTTP_200_OK
    orgs_data = orgs_res.json()
    assert len(orgs_data) == 1
    org_id = orgs_data[0]["id"]
    assert orgs_data[0]["name"] == "Acme Intelligence"

    # 3. List workspaces in the organization using X-Organization-Id header
    ws_headers = {**headers, "X-Organization-Id": org_id}
    ws_res = await client.get("/api/v1/workspaces", headers=ws_headers)
    assert ws_res.status_code == status.HTTP_200_OK
    ws_data = ws_res.json()
    assert len(ws_data) == 1
    assert ws_data[0]["name"] == "Main Workspace"
    assert ws_data[0]["slug"] == "main"
    assert ws_data[0]["is_default"] is True

    # 4. Create a new project workspace
    create_ws_payload = {
        "name": "Q3 Revenue Forecasts",
        "description": "Financial modeling and anomaly detection for Q3",
    }
    create_res = await client.post(
        "/api/v1/workspaces", json=create_ws_payload, headers=ws_headers
    )
    assert create_res.status_code == status.HTTP_201_CREATED
    new_ws = create_res.json()
    assert new_ws["name"] == "Q3 Revenue Forecasts"
    assert new_ws["slug"] == "q3-revenue-forecasts"

    # 5. Fetch activity timeline for the new workspace
    act_res = await client.get(
        f"/api/v1/workspaces/{new_ws['slug']}/activity", headers=ws_headers
    )
    assert act_res.status_code == status.HTTP_200_OK
    act_data = act_res.json()
    assert len(act_data) == 1
    assert act_data[0]["action_type"] == "workspace.create"
    assert "Q3 Revenue Forecasts" in act_data[0]["description"]
