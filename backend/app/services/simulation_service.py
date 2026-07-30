"""
Business logic service for What-If Scenario Simulation & Financial Impact Calculator.
"""
from typing import Any, Dict, List, Optional
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import DecisionOSException
from app.models.dataset import Dataset


class SimulationService:
    """
    Service layer for interactive What-If scenario simulations, elasticity-weighted intervention
    modeling, baseline vs. simulated cumulative comparison, and AI decision intelligence briefings.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def run_what_if_scenario(
        self,
        dataset: Dataset,
        target_column: str,
        base_forecast_data_points: List[Dict[str, Any]],
        trend_multiplier: float = 1.0,
        step_change_pct: float = 0.0,
        adjustments: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """
        Simulate future KPI trajectory under customized business intervention parameters
        (trend acceleration, immediate step change %, and driver feature elasticities).
        """
        if not base_forecast_data_points:
            raise DecisionOSException(
                error_code="EMPTY_BASELINE_FORECAST",
                message="Cannot run What-If scenario simulation without baseline forecast data points.",
            )

        adjustments = adjustments or []
        driver_multiplier = 1.0
        for adj in adjustments:
            pct_change = float(adj.get("percentage_change", 0.0))
            elasticity = float(adj.get("elasticity", 0.0))
            # E.g., +15% spend * 0.4 elasticity = +6% target uplift
            driver_multiplier += (pct_change / 100.0) * elasticity

        forecast_points = [p for p in base_forecast_data_points if p.get("is_forecast")]
        horizon = len(forecast_points) if forecast_points else 1

        comparison_series: List[Dict[str, Any]] = []
        baseline_total = 0.0
        simulated_total = 0.0

        f_idx = 0
        for pt in base_forecast_data_points:
            dt = pt["date"]
            is_forecast = pt.get("is_forecast", False)

            if not is_forecast:
                val = float(pt.get("actual_value") or pt.get("forecast_value") or 0.0)
                comparison_series.append(
                    {
                        "date": dt,
                        "baseline_value": round(val, 2),
                        "simulated_value": round(val, 2),
                        "delta_value": 0.0,
                        "delta_percentage": 0.0,
                        "is_forecast": False,
                    }
                )
            else:
                f_idx += 1
                base_val = float(pt.get("forecast_value") or 0.0)
                baseline_total += base_val

                # Progressive trend growth + immediate step change + elasticity drivers
                trend_factor = 1.0 + (trend_multiplier - 1.0) * (f_idx / horizon)
                step_factor = 1.0 + (step_change_pct / 100.0)
                sim_val = base_val * step_factor * driver_multiplier * trend_factor

                simulated_total += sim_val
                delta_val = sim_val - base_val
                delta_pct = (
                    (delta_val / abs(base_val)) * 100.0 if abs(base_val) > 1e-6 else 0.0
                )

                comparison_series.append(
                    {
                        "date": dt,
                        "baseline_value": round(base_val, 2),
                        "simulated_value": round(sim_val, 2),
                        "delta_value": round(delta_val, 2),
                        "delta_percentage": round(delta_pct, 2),
                        "is_forecast": True,
                    }
                )

        net_delta = round(simulated_total - baseline_total, 2)
        net_percentage = (
            round((net_delta / abs(baseline_total)) * 100.0, 2)
            if abs(baseline_total) > 1e-6
            else 0.0
        )

        # Build AI Decision Recommendation card
        direction_word = "uplift" if net_delta >= 0 else "contraction"
        ai_recommendation = {
            "id": str(uuid.uuid4()),
            "category": "DRIVER" if net_delta >= 0 else "RISK",
            "title": f"Scenario Yields {net_percentage:+}% Net Projected {direction_word.capitalize()}",
            "description": (
                f"Under this What-If intervention (Trend Multiplier: {trend_multiplier}x, Step Change: {step_change_pct:+}%, "
                f"Driver Elasticity adjustments: {len(adjustments)} drivers), cumulative '{target_column}' is projected "
                f"to shift from {baseline_total:,.2f} baseline to {simulated_total:,.2f} simulated—a net {direction_word} "
                f"of {net_delta:+,} across the {horizon}-period forecast horizon."
            ),
            "metric_badge": f"{net_percentage:+}% Impact",
            "severity": "INFO" if net_delta >= 0 else "WARNING",
        }

        return {
            "dataset_id": str(dataset.id),
            "dataset_name": dataset.name,
            "target_column": target_column,
            "baseline_total": round(baseline_total, 2),
            "simulated_total": round(simulated_total, 2),
            "net_delta": net_delta,
            "net_percentage": net_percentage,
            "comparison_series": comparison_series,
            "ai_recommendation": ai_recommendation,
        }
