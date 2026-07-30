"""
Business logic service for Exploratory Data Analysis (EDA) & Auto-Insight Generator.
"""
import uuid
from typing import Any, Dict, List, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import DecisionOSException
from app.models.dataset import Dataset
from app.services.duckdb_engine import DuckDBEngine


class EDAService:
    """
    Service layer orchestrating Exploratory Data Analysis (EDA), statistical correlation
    matrices, distribution skewness analysis, anomaly detection, and automated AI executive
    narrative briefings.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    def _get_numeric_columns(self, dataset: Dataset) -> List[str]:
        """
        Extract numerical column names from dataset schema metadata.
        """
        if not dataset.schema_metadata or "columns" not in dataset.schema_metadata:
            return []

        cols = []
        for col_def in dataset.schema_metadata["columns"]:
            if col_def.get("semantic_type") == "NUMERIC":
                cols.append(col_def["name"])
        return cols

    async def get_correlation_matrix(self, dataset: Dataset) -> Dict[str, Any]:
        """
        Compute Pearson correlation matrix across all numeric columns and identify
        multicollinearity alerts (|r| >= 0.85).
        """
        numeric_cols = self._get_numeric_columns(dataset)
        corr_result = DuckDBEngine.compute_correlation_matrix(
            file_path=dataset.storage_path,
            file_type=dataset.file_type,
            numeric_columns=numeric_cols,
        )

        alerts = []
        for pair in corr_result.get("pairs", []):
            if pair.get("is_collinear"):
                alerts.append(
                    {
                        "id": str(uuid.uuid4()),
                        "title": f"High Multicollinearity: {pair['column_x']} & {pair['column_y']}",
                        "description": (
                            f"Columns '{pair['column_x']}' and '{pair['column_y']}' exhibit a Pearson "
                            f"correlation coefficient of {pair['correlation']} (|r| >= 0.85). Consider dropping "
                            f"one of these features before machine learning modeling to prevent multicollinearity bias."
                        ),
                        "severity": "WARNING",
                        "metric_badge": f"r = {pair['correlation']}",
                    }
                )

        corr_result["alerts"] = alerts
        return corr_result

    async def get_distribution(
        self, dataset: Dataset, column: str
    ) -> Dict[str, Any]:
        """
        Compute univariate distribution statistics (quartiles, IQR, skewness) and 10-bin
        histogram frequencies.
        """
        dist_result = DuckDBEngine.compute_distribution_stats(
            file_path=dataset.storage_path,
            file_type=dataset.file_type,
            column=column,
        )

        skew_val = dist_result.get("skewness", 0.0)
        if abs(skew_val) > 1.0:
            skew_label = "HIGH_SKEW"
            skew_alert = (
                f"Column '{column}' exhibits strong skewness ({skew_val}). Consider applying a log "
                f"or Box-Cox transformation to normalize the distribution."
            )
        elif abs(skew_val) > 0.5:
            skew_label = "MODERATE_SKEW"
            skew_alert = f"Column '{column}' exhibits moderate skewness ({skew_val})."
        else:
            skew_label = "SYMMETRIC"
            skew_alert = f"Column '{column}' exhibits a well-balanced symmetric distribution."

        dist_result["skewness_label"] = skew_label
        dist_result["skewness_alert"] = skew_alert
        return dist_result

    async def get_outliers(
        self,
        dataset: Dataset,
        column: str,
        method: str = "IQR",
        limit: int = 50,
    ) -> Dict[str, Any]:
        """
        Identify statistical outliers in a numerical column using Tukey IQR or Z-Score.
        """
        return DuckDBEngine.compute_outliers(
            file_path=dataset.storage_path,
            file_type=dataset.file_type,
            column=column,
            method=method,
            limit=limit,
        )

    async def generate_auto_insights(self, dataset: Dataset) -> Dict[str, Any]:
        """
        Synthesize automated ThoughtSpot / Zoho Analytics-style Executive Narrative Briefing
        cards by inspecting correlation pairs, skewness, Pareto frequencies, and missing values.
        """
        insights: List[Dict[str, Any]] = []

        # 1. Executive overview insight
        schema_meta = dataset.schema_metadata or {}
        columns_meta = schema_meta.get("columns", [])
        num_cols = [c["name"] for c in columns_meta if c.get("semantic_type") == "NUMERIC"]
        cat_cols = [c["name"] for c in columns_meta if c.get("semantic_type") == "CATEGORICAL"]

        insights.append(
            {
                "id": str(uuid.uuid4()),
                "category": "DRIVER",
                "title": "Dataset Architecture & Profile Summary",
                "description": (
                    f"Dataset '{dataset.name}' contains {dataset.row_count:,} records across "
                    f"{dataset.column_count} columns ({len(num_cols)} numeric KPI metrics and "
                    f"{len(cat_cols)} categorical segmentation dimensions)."
                ),
                "metric_badge": f"{dataset.row_count:,} Rows",
                "severity": "INFO",
            }
        )

        # 2. Check correlations for strong linear drivers
        if len(num_cols) >= 2:
            try:
                corr_result = DuckDBEngine.compute_correlation_matrix(
                    file_path=dataset.storage_path,
                    file_type=dataset.file_type,
                    numeric_columns=num_cols,
                )
                pairs = corr_result.get("pairs", [])
                driver_pair = next(
                    (p for p in pairs if abs(p["correlation"]) >= 0.6 and p["correlation"] < 0.99),
                    None,
                )
                if driver_pair:
                    insights.append(
                        {
                            "id": str(uuid.uuid4()),
                            "category": "DRIVER",
                            "title": f"Strong KPI Relationship: {driver_pair['column_x']} ↔ {driver_pair['column_y']}",
                            "description": (
                                f"Features '{driver_pair['column_x']}' and '{driver_pair['column_y']}' show a "
                                f"significant linear correlation of {driver_pair['correlation']}. Strategic optimization "
                                f"in '{driver_pair['column_x']}' is highly likely to drive proportional changes in '{driver_pair['column_y']}'."
                            ),
                            "metric_badge": f"r = {driver_pair['correlation']}",
                            "severity": "INFO",
                        }
                    )
            except Exception:
                pass

        # 3. Check for Pareto dominance in categorical columns
        for col_def in columns_meta:
            if col_def.get("semantic_type") == "CATEGORICAL":
                top_cat = col_def.get("top_category")
                top_freq = col_def.get("top_category_frequency", 0)
                if top_cat and dataset.row_count > 0:
                    share_pct = round((top_freq / dataset.row_count) * 100.0, 1)
                    if share_pct >= 40.0:
                        insights.append(
                            {
                                "id": str(uuid.uuid4()),
                                "category": "PARETO",
                                "title": f"Pareto Dominance in '{col_def['name']}'",
                                "description": (
                                    f"Category '{top_cat}' dominates the '{col_def['name']}' dimension, accounting "
                                    f"for {share_pct}% ({top_freq:,} rows) of the entire dataset. Segment-specific "
                                    f"strategies should prioritize '{top_cat}'."
                                ),
                                "metric_badge": f"{share_pct}% Share",
                                "severity": "INFO",
                            }
                        )
                        break  # Report top Pareto discovery

        # 4. Check for data quality / missing value concentration
        missing_col = next(
            (c for c in columns_meta if c.get("null_percentage", 0) >= 5.0), None
        )
        if missing_col:
            insights.append(
                {
                    "id": str(uuid.uuid4()),
                    "category": "ANOMALY",
                    "title": f"Missing Data Concentration in '{missing_col['name']}'",
                    "description": (
                        f"Column '{missing_col['name']}' has a missing value density of "
                        f"{missing_col.get('null_percentage')}% ({missing_col.get('null_count', 0):,} rows). "
                        f"We recommend utilizing the Data Cleaning Studio to impute or filter these records."
                    ),
                    "metric_badge": f"{missing_col.get('null_percentage')}% Nulls",
                    "severity": "WARNING",
                }
            )
        else:
            insights.append(
                {
                    "id": str(uuid.uuid4()),
                    "category": "INFO",
                    "title": "Pristine Data Quality Scorecard",
                    "description": (
                        "Zero critical missing value concentrations detected across all profiled "
                        "columns. Dataset is analytical-grade and ready for automated dashboards and ML modeling."
                    ),
                    "metric_badge": "100% Clean",
                    "severity": "INFO",
                }
            )

        return {
            "dataset_id": str(dataset.id),
            "dataset_name": dataset.name,
            "total_insights": len(insights),
            "insights": insights,
        }
