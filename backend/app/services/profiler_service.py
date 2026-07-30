"""
Automated Statistical Schema Profiler Service for DecisionOS Module 2.
Infers semantic data types (NUMERIC, CATEGORICAL, DATETIME, BOOLEAN, TEXT)
and computes column quality scorecard metrics (null %, unique counts, min/max/mean/std).
"""
import os
from typing import Any, Dict, List

import numpy as np
import pandas as pd

from app.core.exceptions import DecisionOSException
from app.models.dataset import DatasetFileType


class ProfilerService:
    """Automated data profiler and schema inference engine."""

    @staticmethod
    def _load_dataframe(file_path: str, file_type: str) -> pd.DataFrame:
        """Load dataset into memory for profiling analysis."""
        if not os.path.exists(file_path):
            raise DecisionOSException(
                error_code="DATASET_FILE_NOT_FOUND",
                message=f"Dataset file missing during profiling: {file_path}",
            )

        try:
            if file_type == DatasetFileType.CSV.value:
                return pd.read_csv(file_path, low_memory=False)
            elif file_type == DatasetFileType.EXCEL.value:
                return pd.read_excel(file_path)
            elif file_type == DatasetFileType.JSON.value:
                return pd.read_json(file_path)
            elif file_type == DatasetFileType.PARQUET.value:
                return pd.read_parquet(file_path)
            else:
                return pd.read_csv(file_path, low_memory=False)
        except Exception as e:
            raise DecisionOSException(
                error_code="PROFILER_FILE_READ_FAILED",
                message=f"Unable to read dataset file format '{file_type}': {str(e)}",
            )

    @staticmethod
    def _infer_semantic_type(series: pd.Series) -> str:
        """Infer high-level semantic domain type for a DataFrame column."""
        dtype = series.dtype

        if pd.api.types.is_bool_dtype(dtype):
            return "BOOLEAN"
        elif pd.api.types.is_numeric_dtype(dtype):
            return "NUMERIC"
        elif pd.api.types.is_datetime64_any_dtype(dtype):
            return "DATETIME"
        else:
            # Check if text string column looks like dates or categorical
            non_null = series.dropna()
            if len(non_null) == 0:
                return "TEXT"

            unique_count = series.nunique(dropna=True)
            total_count = max(len(series), 1)

            # If unique values are <= 20% of rows or <= 50 distinct items, treat as CATEGORICAL
            if unique_count <= 50 or (unique_count / total_count) <= 0.20:
                return "CATEGORICAL"
            return "TEXT"

    @classmethod
    def profile_dataset(cls, file_path: str, file_type: str) -> Dict[str, Any]:
        """
        Execute comprehensive statistical profiling and return schema scorecard JSONB metadata.
        """
        df = cls._load_dataframe(file_path, file_type)
        row_count = len(df)
        column_count = len(df.columns)

        columns_profile: List[Dict[str, Any]] = []

        for col_name in df.columns:
            series = df[col_name]
            semantic_type = cls._infer_semantic_type(series)

            null_count = int(series.isna().sum())
            null_pct = round((null_count / max(row_count, 1)) * 100.0, 2)
            unique_count = int(series.nunique(dropna=True))

            sample_vals = [
                str(v)
                for v in series.dropna().unique()[:3]
                if pd.notnull(v) and str(v).strip() != ""
            ]

            col_info: Dict[str, Any] = {
                "name": str(col_name),
                "semantic_type": semantic_type,
                "data_type": str(series.dtype),
                "null_count": null_count,
                "null_percentage": null_pct,
                "unique_count": unique_count,
                "sample_values": sample_vals,
            }

            if semantic_type == "NUMERIC":
                numeric_series = pd.to_numeric(series, errors="coerce").dropna()
                if len(numeric_series) > 0:
                    col_info["min"] = float(np.round(numeric_series.min(), 4))
                    col_info["max"] = float(np.round(numeric_series.max(), 4))
                    col_info["mean"] = float(np.round(numeric_series.mean(), 4))
                    col_info["std"] = float(
                        np.round(numeric_series.std(ddof=0), 4)
                        if len(numeric_series) > 1
                        else 0.0
                    )
                else:
                    col_info.update(
                        {"min": None, "max": None, "mean": None, "std": None}
                    )
            elif semantic_type == "CATEGORICAL":
                val_counts = series.value_counts()
                if not val_counts.empty:
                    col_info["top_category"] = str(val_counts.index[0])
                    col_info["top_category_freq"] = int(val_counts.iloc[0])

            columns_profile.append(col_info)

        return {
            "row_count": row_count,
            "column_count": column_count,
            "columns": columns_profile,
        }
