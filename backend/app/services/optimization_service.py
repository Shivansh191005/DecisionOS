"""
Prescriptive Optimization & Goal-Seeking Service for Module 8: Constraint Linear & Quadratic Optimization.
"""
import time
from typing import Any, Dict, List, Optional, Tuple

import duckdb
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import DecisionOSException
from app.models.dataset import Dataset
from app.schemas.optimization import (
    OptimizationMetadataResponse,
    OptimizationRequest,
    OptimizationResponse,
    OptimizationResultItem,
)
from app.services.duckdb_engine import DuckDBEngine


class OptimizationService:
    """
    Service layer for Goal-Seeking (Inverse Elasticity) and Constrained Resource
    Allocation solvers over vectorized DuckDB datasets.
    """

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_optimization_metadata(
        self, dataset: Dataset
    ) -> OptimizationMetadataResponse:
        """
        Inspect dataset schema to return selectable numeric Target KPI/Resource columns
        and categorical Segment columns.
        """
        file_path = dataset.storage_path
        file_type = dataset.file_type
        table_expr = DuckDBEngine._get_table_expression(file_path, file_type)

        conn = duckdb.connect(database=":memory:", read_only=False)
        try:
            desc_rows = conn.execute(f"DESCRIBE SELECT * FROM {table_expr}").fetchall()
            numeric_cols = []
            categorical_cols = []

            for r in desc_rows:
                col_name = str(r[0])
                col_type = str(r[1]).upper()

                if any(
                    t in col_type
                    for t in [
                        "INT",
                        "DOUBLE",
                        "FLOAT",
                        "DECIMAL",
                        "REAL",
                        "NUMERIC",
                        "BIGINT",
                    ]
                ):
                    numeric_cols.append(col_name)

                if any(
                    t in col_type for t in ["VARCHAR", "TEXT", "STRING", "CHAR", "BOOLEAN"]
                ):
                    categorical_cols.append(col_name)

            if not categorical_cols:
                categorical_cols = [
                    str(r[0]) for r in desc_rows if str(r[0]) not in numeric_cols
                ]

            return OptimizationMetadataResponse(
                numeric_columns=numeric_cols,
                categorical_columns=categorical_cols,
            )
        except Exception as e:
            raise DecisionOSException(
                error_code="OPTIMIZATION_METADATA_ERROR",
                message=f"Failed to inspect schema for Optimization metadata: {str(e)}",
            )
        finally:
            conn.close()

    async def solve_optimization(
        self,
        dataset: Dataset,
        request: OptimizationRequest,
    ) -> OptimizationResponse:
        """
        Execute Goal-Seeking or Constrained Resource Allocation solver over DuckDB.
        """
        start_time = time.perf_counter()
        file_path = dataset.storage_path
        file_type = dataset.file_type
        table_expr = DuckDBEngine._get_table_expression(file_path, file_type)

        mode = request.mode.upper()
        if mode not in ["GOAL_SEEK", "RESOURCE_ALLOCATION"]:
            raise DecisionOSException(
                error_code="INVALID_OPTIMIZATION_MODE",
                message=f"Unsupported optimization mode '{mode}'. Use 'GOAL_SEEK' or 'RESOURCE_ALLOCATION'.",
            )

        target_col = request.target_column
        resource_col = request.constraint_column
        segment_col = request.segment_column
        max_adj_pct = max(5.0, min(200.0, request.max_adjustment_pct))

        conn = duckdb.connect(database=":memory:", read_only=False)
        try:
            # 1. Discover resource column and segment column if omitted
            meta = await self.get_optimization_metadata(dataset)
            if not resource_col or resource_col == target_col:
                other_num = [c for c in meta.numeric_columns if c != target_col]
                resource_col = other_num[0] if other_num else target_col

            if not segment_col:
                segment_col = (
                    meta.categorical_columns[0]
                    if meta.categorical_columns
                    else "segment_all"
                )

            # 2. Query baseline segment statistics
            if segment_col in meta.categorical_columns:
                sql = f"""
                    SELECT "{segment_col}" as seg,
                           SUM("{target_col}") as target_sum,
                           SUM("{resource_col}") as resource_sum,
                           COUNT(*) as cnt
                    FROM {table_expr}
                    WHERE "{target_col}" IS NOT NULL AND "{resource_col}" IS NOT NULL
                    GROUP BY "{segment_col}"
                    HAVING COUNT(*) > 0
                    ORDER BY target_sum DESC
                """
            else:
                # Fallback single global segment
                sql = f"""
                    SELECT 'All Data' as seg,
                           SUM("{target_col}") as target_sum,
                           SUM("{resource_col}") as resource_sum,
                           COUNT(*) as cnt
                    FROM {table_expr}
                    WHERE "{target_col}" IS NOT NULL AND "{resource_col}" IS NOT NULL
                """

            rows = conn.execute(sql).fetchall()
            if not rows:
                raise DecisionOSException(
                    error_code="EMPTY_OPTIMIZATION_DATA",
                    message="No valid rows found to execute optimization solver.",
                )

            # 3. Compute baseline metrics per segment
            segments: List[Dict[str, Any]] = []
            baseline_target_total = 0.0
            baseline_resource_total = 0.0

            for r in rows:
                seg_name = str(r[0])
                tsum = float(r[1] or 0.0)
                rsum = float(r[2] or 0.0)
                roi_eff = tsum / max(0.0001, rsum)
                segments.append(
                    {
                        "name": seg_name,
                        "current_target": tsum,
                        "current_resource": rsum,
                        "roi_efficiency": roi_eff,
                    }
                )
                baseline_target_total += tsum
                baseline_resource_total += rsum

            # 4. Run Solver Mode
            allocations: List[OptimizationResultItem] = []

            if mode == "GOAL_SEEK":
                target_goal = request.target_goal_value
                if target_goal is None or target_goal <= 0:
                    target_goal = baseline_target_total * 1.15  # Default +15% goal

                target_uplift = target_goal - baseline_target_total

                # Weight segment adjustments by ROI efficiency
                total_eff_weight = sum(
                    s["roi_efficiency"] * max(0.001, s["current_resource"])
                    for s in segments
                )

                for s in segments:
                    cur_res = s["current_resource"]
                    cur_target = s["current_target"]
                    eff = s["roi_efficiency"]

                    weight = (eff * max(0.001, cur_res)) / max(0.001, total_eff_weight)
                    raw_delta_res = (
                        (target_uplift / max(0.001, eff)) * weight
                        if eff > 0
                        else 0.0
                    )

                    # Clamp delta to max_adjustment_pct bounds
                    max_delta = cur_res * (max_adj_pct / 100.0)
                    clamped_delta = max(-max_delta, min(max_delta, raw_delta_res))

                    rec_res = cur_res + clamped_delta
                    adj_pct = (
                        (clamped_delta / max(0.001, cur_res)) * 100.0
                        if cur_res > 0
                        else 0.0
                    )
                    expected_impact = cur_target + clamped_delta * eff

                    allocations.append(
                        OptimizationResultItem(
                            segment_or_driver=s["name"],
                            current_value=round(cur_res, 2),
                            recommended_value=round(rec_res, 2),
                            adjustment_delta=round(clamped_delta, 2),
                            adjustment_pct=round(adj_pct, 2),
                            expected_kpi_impact=round(expected_impact, 2),
                            efficiency_roi=round(eff, 2),
                        )
                    )

            else:
                # RESOURCE_ALLOCATION Mode
                total_budget = request.total_budget_constraint
                if total_budget is None or total_budget <= 0:
                    total_budget = baseline_resource_total * 1.20  # Default +20% budget

                # Allocate proportional to efficiency ROI ^ 1.5
                total_score = sum(
                    (s["roi_efficiency"] ** 1.5) * max(0.001, s["current_resource"])
                    for s in segments
                )

                for s in segments:
                    cur_res = s["current_resource"]
                    cur_target = s["current_target"]
                    eff = s["roi_efficiency"]

                    score = (eff ** 1.5) * max(0.001, cur_res)
                    norm_score = score / max(0.001, total_score)
                    raw_proposed = total_budget * norm_score

                    # Clamp to max adjustment bounds
                    min_res = cur_res * (1.0 - max_adj_pct / 100.0)
                    max_res = cur_res * (1.0 + max_adj_pct / 100.0)
                    rec_res = max(min_res, min(max_res, raw_proposed))

                    clamped_delta = rec_res - cur_res
                    adj_pct = (
                        (clamped_delta / max(0.001, cur_res)) * 100.0
                        if cur_res > 0
                        else 0.0
                    )
                    expected_impact = rec_res * eff

                    allocations.append(
                        OptimizationResultItem(
                            segment_or_driver=s["name"],
                            current_value=round(cur_res, 2),
                            recommended_value=round(rec_res, 2),
                            adjustment_delta=round(clamped_delta, 2),
                            adjustment_pct=round(adj_pct, 2),
                            expected_kpi_impact=round(expected_impact, 2),
                            efficiency_roi=round(eff, 2),
                        )
                    )

            # 5. Summarize total optimized KPI and synthesize AI Narrative
            optimized_target_total = sum(item.expected_kpi_impact for item in allocations)
            total_uplift_pct = (
                (optimized_target_total - baseline_target_total)
                / max(0.001, baseline_target_total)
            ) * 100.0

            ai_narrative = self._synthesize_prescriptive_narrative(
                mode=mode,
                target_col=target_col,
                resource_col=resource_col,
                baseline_val=baseline_target_total,
                optimized_val=optimized_target_total,
                uplift_pct=total_uplift_pct,
                allocations=allocations,
            )

            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
            return OptimizationResponse(
                mode=mode,
                target_column=target_col,
                baseline_kpi_value=round(baseline_target_total, 2),
                optimized_kpi_value=round(optimized_target_total, 2),
                total_uplift_pct=round(total_uplift_pct, 2),
                allocations=allocations,
                ai_prescriptive_narrative=ai_narrative,
                execution_time_ms=elapsed_ms,
            )

        except Exception as e:
            if isinstance(e, DecisionOSException):
                raise e
            raise DecisionOSException(
                error_code="OPTIMIZATION_SOLVER_FAILED",
                message=f"Prescriptive optimization solver failed: {str(e)}",
            )
        finally:
            conn.close()

    def _synthesize_prescriptive_narrative(
        self,
        mode: str,
        target_col: str,
        resource_col: str,
        baseline_val: float,
        optimized_val: float,
        uplift_pct: float,
        allocations: List[OptimizationResultItem],
    ) -> str:
        """
        Synthesize plain-English AI executive prescriptive recommendation action plan.
        """
        if not allocations:
            return "No prescriptive allocations were generated."

        top_eff = max(allocations, key=lambda x: x.efficiency_roi)
        top_growth = max(allocations, key=lambda x: x.adjustment_delta)

        mode_label = (
            "Goal-Seeking Inverse Elasticity"
            if mode == "GOAL_SEEK"
            else "Constrained Resource Allocation"
        )

        narrative = (
            f"AI Prescriptive Action Plan ({mode_label}): Optimized Target KPI '{target_col}' "
            f"from ${baseline_val:,.2f} to ${optimized_val:,.2f} (a {uplift_pct:+.1f}% overall uplift). "
            f"The highest ROI efficiency segment is '{top_eff.segment_or_driver}', returning {top_eff.efficiency_roi}x "
            f"per dollar of '{resource_col}'. Recommendation: Reallocate {top_growth.adjustment_delta:+,.2f} "
            f"({top_growth.adjustment_pct:+,.1f}%) to '{top_growth.segment_or_driver}' while capping low-efficiency segments "
            f"within configured bounds to maximize enterprise return."
        )
        return narrative
