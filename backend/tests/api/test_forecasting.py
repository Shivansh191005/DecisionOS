"""
Integration tests for Module 5: Automated Time-Series Forecasting & What-If Scenario Engine.
"""
import io

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_forecasting_and_what_if_scenario_workflow(client: AsyncClient):
    """
    Test end-to-end integration:
    1. Register user and initialize workspace.
    2. Upload time-series sales CSV dataset.
    3. Inspect available time-series date and numeric target columns.
    4. Generate automated multi-model forecast with 80%/95% confidence bounds.
    5. Run interactive What-If scenario simulation with elasticity driver weights.
    """
    # 1. Register User & Login
    register_payload = {
        "email": "forecasting_eng@decisionos.ai",
        "password": "SecurePassword123!",
        "full_name": "Senior Time-Series Scientist",
        "organization_name": "ForecastAI Corp",
    }
    reg_res = await client.post("/api/v1/auth/register", json=register_payload)
    assert reg_res.status_code == 201
    auth_data = reg_res.json()
    token = auth_data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Get Organization ID
    orgs_res = await client.get("/api/v1/organizations", headers=headers)
    assert orgs_res.status_code == 200
    org_id = orgs_res.json()[0]["id"]
    headers["X-Organization-Id"] = org_id

    # Get Workspace Slug
    ws_res = await client.get("/api/v1/workspaces", headers=headers)
    assert ws_res.status_code == 200
    workspaces = ws_res.json()
    assert len(workspaces) >= 1
    workspace_slug = workspaces[0]["slug"]

    # 2. Upload Time-Series Sales Dataset
    csv_content = (
        "date,revenue,marketing_spend,region\n"
        "2025-01-01,10000.0,1200.0,North\n"
        "2025-02-01,10500.0,1300.0,North\n"
        "2025-03-01,11200.0,1400.0,North\n"
        "2025-04-01,12000.0,1500.0,North\n"
        "2025-05-01,12800.0,1650.0,North\n"
        "2025-06-01,13500.0,1800.0,North\n"
    ).encode("utf-8")

    file_obj = io.BytesIO(csv_content)
    file_obj.name = "monthly_revenue_series.csv"
    upload_res = await client.post(
        f"/api/v1/workspaces/{workspace_slug}/datasets",
        files={"file": ("monthly_revenue_series.csv", file_obj, "text/csv")},
        data={"display_name": "Monthly Revenue Series"},
        headers=headers,
    )
    assert upload_res.status_code == 201
    dataset_data = upload_res.json()
    dataset_id = dataset_data["id"]
    assert dataset_data["row_count"] == 6

    # 3. Inspect Time-Series Metadata
    meta_res = await client.get(
        f"/api/v1/workspaces/{workspace_slug}/datasets/{dataset_id}/forecasting/metadata",
        headers=headers,
    )
    assert meta_res.status_code == 200
    meta_data = meta_res.json()
    assert "date" in meta_data["date_columns"]
    assert "revenue" in meta_data["numeric_columns"]
    assert "marketing_spend" in meta_data["numeric_columns"]

    # 4. Generate Automated Time-Series Forecast
    forecast_req = {
        "date_column": "date",
        "target_column": "revenue",
        "agg_fn": "SUM",
        "horizon": 6,
        "frequency": "M",
        "model_type": "AUTO",
    }
    forecast_res = await client.post(
        f"/api/v1/workspaces/{workspace_slug}/datasets/{dataset_id}/forecasting/forecast",
        json=forecast_req,
        headers=headers,
    )
    assert forecast_res.status_code == 200
    f_data = forecast_res.json()
    assert f_data["model_type_used"] in ["ETS", "ARIMA", "LINEAR_TREND"]
    assert f_data["horizon"] == 6
    assert len(f_data["data_points"]) == 12  # 6 historical + 6 forecast
    assert f_data["metrics"]["mape"] >= 0.0
    assert f_data["ai_brief"]["category"] == "DRIVER"

    # Check that forecast data points have valid confidence intervals
    forecast_pts = [pt for pt in f_data["data_points"] if pt["is_forecast"]]
    assert len(forecast_pts) == 6
    for pt in forecast_pts:
        assert pt["lower_95"] <= pt["lower_80"] <= pt["forecast_value"]
        assert pt["forecast_value"] <= pt["upper_80"] <= pt["upper_95"]

    # 5. Run What-If Scenario Simulation (+20% Trend Multiplier + 10% Spend with 0.5 Elasticity)
    whatif_req = {
        "target_column": "revenue",
        "base_forecast_data_points": f_data["data_points"],
        "trend_multiplier": 1.20,
        "step_change_pct": 5.0,
        "adjustments": [
            {
                "driver_column": "marketing_spend",
                "percentage_change": 10.0,
                "elasticity": 0.5,
            }
        ],
    }
    whatif_res = await client.post(
        f"/api/v1/workspaces/{workspace_slug}/datasets/{dataset_id}/forecasting/what-if",
        json=whatif_req,
        headers=headers,
    )
    assert whatif_res.status_code == 200
    w_data = whatif_res.json()
    assert w_data["simulated_total"] > w_data["baseline_total"]
    assert w_data["net_delta"] > 0
    assert w_data["net_percentage"] > 0
    assert "Uplift" in w_data["ai_recommendation"]["title"]
    assert len(w_data["comparison_series"]) == 12
