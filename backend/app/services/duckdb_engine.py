"""
DuckDB High-Performance Analytical OLAP Query Engine Wrapper.
Provides sub-millisecond data previews, sorting, filtering, and analytical queries
over uploaded CSV, JSON, Parquet, and Excel datasets without loading entire files into Python RAM.
"""
import os
import re
from typing import Any, Dict, List, Optional

import duckdb
import pandas as pd

from app.core.exceptions import DecisionOSException
from app.models.dataset import DatasetFileType


class DuckDBEngine:
    """Stateless DuckDB analytical query service for enterprise datasets."""

    @staticmethod
    def _get_table_expression(file_path: str, file_type: str) -> str:
        """
        Return the appropriate DuckDB SQL table expression for the file format.
        """
        if not os.path.exists(file_path):
            raise DecisionOSException(
                error_code="DATASET_FILE_NOT_FOUND",
                message=f"Dataset storage file not found at path: {file_path}",
            )

        # Normalize Windows backslashes for DuckDB SQL path string
        clean_path = file_path.replace("\\", "/")

        if file_type == DatasetFileType.CSV.value:
            return f"read_csv_auto('{clean_path}', ignore_errors=true)"
        elif file_type == DatasetFileType.JSON.value:
            return f"read_json_auto('{clean_path}')"
        elif file_type == DatasetFileType.PARQUET.value:
            return f"read_parquet('{clean_path}')"
        elif file_type == DatasetFileType.EXCEL.value:
            # For Excel, load via pandas and register as in-memory DuckDB view
            return "excel_dataset_view"
        else:
            return f"read_csv_auto('{clean_path}', ignore_errors=true)"

    @classmethod
    def get_dataset_preview(
        cls,
        file_path: str,
        file_type: str,
        limit: int = 50,
        offset: int = 0,
        sort_by: Optional[str] = None,
        sort_order: str = "asc",
    ) -> Dict[str, Any]:
        """
        Execute an analytical SQL preview query returning paginated rows and column headers.
        """
        limit = min(max(1, limit), 500)  # Max 500 rows per preview
        offset = max(0, offset)

        conn = duckdb.connect(database=":memory:", read_only=False)
        try:
            table_expr = cls._get_table_expression(file_path, file_type)

            # Register Excel view if file is .xlsx
            if file_type == DatasetFileType.EXCEL.value:
                df = pd.read_excel(file_path)
                conn.register("excel_dataset_view", df)

            # 1. Total row count query
            count_sql = f"SELECT COUNT(*) as total_count FROM {table_expr}"
            total_rows = int(conn.execute(count_sql).fetchone()[0])  # type: ignore

            # 2. Build paginated preview query
            order_clause = ""
            if sort_by and re.match(r"^[a-zA-Z0-9_]+$", sort_by):
                direction = "DESC" if sort_order.lower() == "desc" else "ASC"
                order_clause = f'ORDER BY "{sort_by}" {direction}'

            preview_sql = (
                f"SELECT * FROM {table_expr} {order_clause} "
                f"LIMIT {limit} OFFSET {offset}"
            )

            result_df = conn.execute(preview_sql).df()

            # Replace NaN/NaT with None for JSON serialization
            result_df = result_df.where(pd.notnull(result_df), None)

            columns = list(result_df.columns)
            rows = result_df.to_dict(orient="records")

            return {
                "columns": columns,
                "rows": rows,
                "total_rows": total_rows,
                "limit": limit,
                "offset": offset,
            }
        except Exception as e:
            raise DecisionOSException(
                error_code="DUCKDB_QUERY_ERROR",
                message=f"Failed to execute DuckDB dataset preview: {str(e)}",
            )
        finally:
            conn.close()

    @classmethod
    def execute_analytical_query(
        cls, file_path: str, file_type: str, sql_query: str
    ) -> Dict[str, Any]:
        """
        Execute a safe read-only analytical SQL query against the dataset.
        The keyword 'dataset' in the SQL string is substituted with the DuckDB table expression.
        """
        cleaned_sql = sql_query.strip()
        forbidden_keywords = [
            "DROP",
            "DELETE",
            "UPDATE",
            "INSERT",
            "ALTER",
            "ATTACH",
            "COPY",
            "EXPORT",
            "CREATE",
            "PRAGMA",
        ]
        for kw in forbidden_keywords:
            if re.search(rf"\b{kw}\b", cleaned_sql, re.IGNORECASE):
                raise DecisionOSException(
                    error_code="UNSAFE_SQL_QUERY",
                    message=f"SQL statement contains forbidden keyword: '{kw}'. Only SELECT aggregations are permitted.",
                )

        conn = duckdb.connect(database=":memory:", read_only=False)
        try:
            table_expr = cls._get_table_expression(file_path, file_type)
            if file_type == DatasetFileType.EXCEL.value:
                df = pd.read_excel(file_path)
                conn.register("excel_dataset_view", df)

            # Replace case-insensitive table reference 'dataset' or 'from dataset' with table_expr
            substituted_sql = re.sub(
                r"\bdataset\b", table_expr, cleaned_sql, flags=re.IGNORECASE
            )

            result_df = conn.execute(substituted_sql).df()
            result_df = result_df.where(pd.notnull(result_df), None)

            columns = list(result_df.columns)
            rows = result_df.to_dict(orient="records")

            return {
                "columns": columns,
                "rows": rows,
                "row_count": len(rows),
                "sql_executed": substituted_sql,
            }
        except Exception as e:
            raise DecisionOSException(
                error_code="DUCKDB_ANALYTICAL_QUERY_FAILED",
                message=f"Analytical query execution failed: {str(e)}",
            )
        finally:
            conn.close()

    @classmethod
    def build_cleaning_sql(
        cls,
        table_expr: str,
        columns: List[str],
        steps: List[Dict[str, Any]],
    ) -> str:
        """
        Compile ordered JSON cleaning recipe steps into a vectorized DuckDB CTE SQL query.
        """
        if not steps:
            return f"SELECT * FROM {table_expr}"

        cte_queries = [f"cte_0 AS (SELECT * FROM {table_expr})"]
        current_cols = list(columns)

        for idx, step in enumerate(steps, start=1):
            prev_table = f"cte_{idx - 1}"
            step_type = (
                step.get("type", "").upper().strip()
                if isinstance(step.get("type"), str)
                else ""
            )

            if step_type == "IMPUTE_NULL":
                col = step.get("column")
                strategy = (
                    step.get("strategy", "MEAN").upper()
                    if isinstance(step.get("strategy"), str)
                    else "MEAN"
                )
                value = step.get("value", 0)
                if not col or col not in current_cols:
                    cte_queries.append(f"cte_{idx} AS (SELECT * FROM {prev_table})")
                    continue

                col_exprs = []
                for c in current_cols:
                    if c == col:
                        if strategy == "MEAN":
                            col_exprs.append(
                                f"COALESCE({c}, (SELECT AVG({c}) FROM {prev_table})) AS {c}"
                            )
                        elif strategy == "MEDIAN":
                            col_exprs.append(
                                f"COALESCE({c}, (SELECT MEDIAN({c}) FROM {prev_table})) AS {c}"
                            )
                        elif strategy == "MODE":
                            col_exprs.append(
                                f"COALESCE({c}, (SELECT MODE({c}) FROM {prev_table})) AS {c}"
                            )
                        elif strategy == "CONSTANT":
                            val_str = f"'{value}'" if isinstance(value, str) else str(value)
                            col_exprs.append(f"COALESCE({c}, {val_str}) AS {c}")
                        else:
                            col_exprs.append(
                                f"COALESCE({c}, (SELECT AVG({c}) FROM {prev_table})) AS {c}"
                            )
                    else:
                        col_exprs.append(f"{c}")

                cte_queries.append(
                    f"cte_{idx} AS (SELECT {', '.join(col_exprs)} FROM {prev_table})"
                )

            elif step_type == "DROP_COLUMN":
                col = step.get("column")
                if col and col in current_cols:
                    current_cols.remove(col)
                if not current_cols:
                    current_cols = [col]
                col_list = ", ".join(current_cols)
                cte_queries.append(
                    f"cte_{idx} AS (SELECT {col_list} FROM {prev_table})"
                )

            elif step_type == "FILTER_ROWS":
                condition = step.get("condition", "")
                if not condition or not isinstance(condition, str):
                    cte_queries.append(f"cte_{idx} AS (SELECT * FROM {prev_table})")
                else:
                    cte_queries.append(
                        f"cte_{idx} AS (SELECT * FROM {prev_table} WHERE ({condition}))"
                    )

            elif step_type == "CAST_TYPE":
                col = step.get("column")
                target_type = (
                    step.get("target_type", "VARCHAR").upper()
                    if isinstance(step.get("target_type"), str)
                    else "VARCHAR"
                )
                if not col or col not in current_cols:
                    cte_queries.append(f"cte_{idx} AS (SELECT * FROM {prev_table})")
                    continue
                col_exprs = []
                for c in current_cols:
                    if c == col:
                        col_exprs.append(f"CAST({c} AS {target_type}) AS {c}")
                    else:
                        col_exprs.append(f"{c}")
                cte_queries.append(
                    f"cte_{idx} AS (SELECT {', '.join(col_exprs)} FROM {prev_table})"
                )

            elif step_type == "DERIVED_COLUMN":
                new_col = step.get("new_column")
                formula = step.get("formula")
                if not new_col or not formula:
                    cte_queries.append(f"cte_{idx} AS (SELECT * FROM {prev_table})")
                    continue
                col_exprs = []
                if new_col in current_cols:
                    for c in current_cols:
                        if c == new_col:
                            col_exprs.append(f"({formula}) AS {new_col}")
                        else:
                            col_exprs.append(f"{c}")
                else:
                    col_exprs = [f"{c}" for c in current_cols] + [
                        f"({formula}) AS {new_col}"
                    ]
                    current_cols.append(new_col)
                cte_queries.append(
                    f"cte_{idx} AS (SELECT {', '.join(col_exprs)} FROM {prev_table})"
                )

            elif step_type == "BIN_COLUMN":
                col = step.get("column")
                new_col = step.get("new_column", f"{col}_binned")
                bins = step.get("bins", [])
                if not col or not bins or col not in current_cols:
                    cte_queries.append(f"cte_{idx} AS (SELECT * FROM {prev_table})")
                    continue

                case_parts = []
                for b in bins:
                    cond = b.get("condition", "")
                    label = b.get("label", "")
                    if cond and label:
                        case_parts.append(f"WHEN ({cond}) THEN '{label}'")
                case_parts.append("ELSE 'Other'")
                case_expr = f"CASE {' '.join(case_parts)} END AS {new_col}"

                col_exprs = []
                if new_col in current_cols:
                    for c in current_cols:
                        if c == new_col:
                            col_exprs.append(case_expr)
                        else:
                            col_exprs.append(f"{c}")
                else:
                    col_exprs = [f"{c}" for c in current_cols] + [case_expr]
                    current_cols.append(new_col)
                cte_queries.append(
                    f"cte_{idx} AS (SELECT {', '.join(col_exprs)} FROM {prev_table})"
                )

            else:
                cte_queries.append(f"cte_{idx} AS (SELECT * FROM {prev_table})")

        final_cte = f"cte_{len(steps)}"
        return f"WITH {', '.join(cte_queries)} SELECT * FROM {final_cte}"

    @classmethod
    def preview_cleaned_dataset(
        cls,
        file_path: str,
        file_type: str,
        columns: List[str],
        steps: List[Dict[str, Any]],
        limit: int = 50,
        offset: int = 0,
    ) -> Dict[str, Any]:
        """
        Execute vectorized cleaning SQL query and return paginated preview of cleaned rows.
        """
        table_expr = cls._get_table_expression(file_path, file_type)
        cleaning_sql = cls.build_cleaning_sql(table_expr, columns, steps)

        conn = duckdb.connect(database=":memory:", read_only=False)
        try:
            if file_type == DatasetFileType.EXCEL.value:
                df = pd.read_excel(file_path)
                conn.register("excel_dataset_view", df)

            count_sql = f"SELECT COUNT(*) as cnt FROM ({cleaning_sql}) AS _clean_t"
            total_rows = int(conn.execute(count_sql).fetchone()[0])

            paginated_sql = (
                f"SELECT * FROM ({cleaning_sql}) AS _clean_t LIMIT {limit} OFFSET {offset}"
            )
            result_df = conn.execute(paginated_sql).df()
            result_df = result_df.where(pd.notnull(result_df), None)

            out_columns = list(result_df.columns)
            rows = result_df.to_dict(orient="records")

            return {
                "columns": out_columns,
                "rows": rows,
                "total_rows": total_rows,
                "limit": limit,
                "offset": offset,
                "sql_executed": paginated_sql,
            }
        except Exception as e:
            raise DecisionOSException(
                error_code="DUCKDB_CLEANING_PREVIEW_FAILED",
                message=f"Cleaning recipe preview execution failed: {str(e)}",
            )
        finally:
            conn.close()

    @classmethod
    def materialize_cleaned_dataset(
        cls,
        file_path: str,
        file_type: str,
        dest_path: str,
        columns: List[str],
        steps: List[Dict[str, Any]],
    ) -> int:
        """
        Execute cleaning query and export the cleaned result to dest_path (CSV).
        Returns the number of rows exported.
        """
        table_expr = cls._get_table_expression(file_path, file_type)
        cleaning_sql = cls.build_cleaning_sql(table_expr, columns, steps)

        conn = duckdb.connect(database=":memory:", read_only=False)
        try:
            if file_type == DatasetFileType.EXCEL.value:
                df = pd.read_excel(file_path)
                conn.register("excel_dataset_view", df)

            count_sql = f"SELECT COUNT(*) as cnt FROM ({cleaning_sql}) AS _clean_t"
            total_rows = int(conn.execute(count_sql).fetchone()[0])

            os.makedirs(os.path.dirname(dest_path), exist_ok=True)
            dest_normalized = dest_path.replace("\\", "/")
            copy_sql = (
                f"COPY ({cleaning_sql}) TO '{dest_normalized}' (HEADER, DELIMITER ',')"
            )
            conn.execute(copy_sql)

            return total_rows
        except Exception as e:
            raise DecisionOSException(
                error_code="DUCKDB_MATERIALIZE_FAILED",
                message=f"Cleaned dataset materialization failed: {str(e)}",
            )
        finally:
            conn.close()

    @classmethod
    def compute_correlation_matrix(
        cls,
        file_path: str,
        file_type: str,
        numeric_columns: List[str],
    ) -> Dict[str, Any]:
        """
        Execute vectorized Pearson correlation CORR(x, y) across all numerical column pairs.
        """
        if not numeric_columns or len(numeric_columns) < 2:
            return {
                "columns": numeric_columns,
                "pairs": [],
                "matrix": {col: {col: 1.0} for col in numeric_columns},
            }

        table_expr = cls._get_table_expression(file_path, file_type)
        conn = duckdb.connect(database=":memory:", read_only=False)
        try:
            if file_type == DatasetFileType.EXCEL.value:
                df = pd.read_excel(file_path)
                conn.register("excel_dataset_view", df)

            select_exprs = []
            pair_keys = []
            for i in range(len(numeric_columns)):
                for j in range(i + 1, len(numeric_columns)):
                    col1 = numeric_columns[i]
                    col2 = numeric_columns[j]
                    alias = f"corr_{i}_{j}"
                    select_exprs.append(f'CORR("{col1}", "{col2}") AS {alias}')
                    pair_keys.append((col1, col2, alias))

            sql = f"SELECT {', '.join(select_exprs)} FROM {table_expr}"
            row = conn.execute(sql).fetchone()

            pairs = []
            matrix = {col: {c: 1.0 if c == col else 0.0 for c in numeric_columns} for col in numeric_columns}

            if row:
                for idx, (col1, col2, alias) in enumerate(pair_keys):
                    val = row[idx]
                    corr_val = float(val) if val is not None else 0.0
                    corr_val = round(corr_val, 4)
                    is_collinear = abs(corr_val) >= 0.85

                    pairs.append(
                        {
                            "column_x": col1,
                            "column_y": col2,
                            "correlation": corr_val,
                            "is_collinear": is_collinear,
                        }
                    )
                    matrix[col1][col2] = corr_val
                    matrix[col2][col1] = corr_val

            # Sort pairs by absolute correlation descending
            pairs.sort(key=lambda p: abs(p["correlation"]), reverse=True)

            return {
                "columns": numeric_columns,
                "pairs": pairs,
                "matrix": matrix,
            }
        except Exception as e:
            raise DecisionOSException(
                error_code="DUCKDB_CORRELATION_FAILED",
                message=f"Correlation matrix calculation failed: {str(e)}",
            )
        finally:
            conn.close()

    @classmethod
    def compute_distribution_stats(
        cls,
        file_path: str,
        file_type: str,
        column: str,
    ) -> Dict[str, Any]:
        """
        Compute univariate distribution statistics: min, Q1, median, Q3, max, IQR, skewness,
        and 10 equal-width histogram frequency bins.
        """
        table_expr = cls._get_table_expression(file_path, file_type)
        conn = duckdb.connect(database=":memory:", read_only=False)
        try:
            if file_type == DatasetFileType.EXCEL.value:
                df = pd.read_excel(file_path)
                conn.register("excel_dataset_view", df)

            stats_sql = f"""
                SELECT
                    MIN("{column}") AS min_val,
                    quantile_cont("{column}", 0.25) AS q1_val,
                    quantile_cont("{column}", 0.50) AS median_val,
                    quantile_cont("{column}", 0.75) AS q3_val,
                    MAX("{column}") AS max_val,
                    AVG("{column}") AS mean_val,
                    STDDEV("{column}") AS std_val,
                    COUNT("{column}") AS count_val
                FROM {table_expr}
                WHERE "{column}" IS NOT NULL
            """
            row = conn.execute(stats_sql).fetchone()
            if not row or row[7] == 0:
                return {
                    "column": column,
                    "min": 0.0,
                    "q1": 0.0,
                    "median": 0.0,
                    "q3": 0.0,
                    "max": 0.0,
                    "mean": 0.0,
                    "std": 0.0,
                    "iqr": 0.0,
                    "skewness": 0.0,
                    "histogram_bins": [],
                }

            min_val = float(row[0]) if row[0] is not None else 0.0
            q1_val = float(row[1]) if row[1] is not None else 0.0
            median_val = float(row[2]) if row[2] is not None else 0.0
            q3_val = float(row[3]) if row[3] is not None else 0.0
            max_val = float(row[4]) if row[4] is not None else 0.0
            mean_val = float(row[5]) if row[5] is not None else 0.0
            std_val = float(row[6]) if row[6] is not None else 0.0
            iqr_val = q3_val - q1_val

            # Compute skewness
            skew_val = 0.0
            try:
                skew_sql = f'SELECT SKEWNESS("{column}") FROM {table_expr} WHERE "{column}" IS NOT NULL'
                s_row = conn.execute(skew_sql).fetchone()
                if s_row and s_row[0] is not None:
                    skew_val = round(float(s_row[0]), 4)
            except Exception:
                # Fallback if skewness fails or zero variance
                skew_val = 0.0

            # Compute 10 equal-width histogram bins
            histogram_bins = []
            if min_val == max_val:
                histogram_bins.append(
                    {
                        "bin_index": 0,
                        "range_start": min_val,
                        "range_end": max_val,
                        "label": f"{min_val}",
                        "count": int(row[7]),
                    }
                )
            else:
                step = (max_val - min_val) / 10.0
                bin_sql = f"""
                    SELECT
                        LEAST(FLOOR(("{column}" - {min_val}) / {step}), 9) AS bin_idx,
                        COUNT(*) AS bin_cnt
                    FROM {table_expr}
                    WHERE "{column}" IS NOT NULL
                    GROUP BY bin_idx
                    ORDER BY bin_idx
                """
                bin_rows = conn.execute(bin_sql).fetchall()
                counts_map = {int(r[0]): int(r[1]) for r in bin_rows if r[0] is not None}

                for i in range(10):
                    b_start = round(min_val + i * step, 2)
                    b_end = round(min_val + (i + 1) * step, 2)
                    histogram_bins.append(
                        {
                            "bin_index": i,
                            "range_start": b_start,
                            "range_end": b_end,
                            "label": f"{b_start} - {b_end}",
                            "count": counts_map.get(i, 0),
                        }
                    )

            return {
                "column": column,
                "min": round(min_val, 4),
                "q1": round(q1_val, 4),
                "median": round(median_val, 4),
                "q3": round(q3_val, 4),
                "max": round(max_val, 4),
                "mean": round(mean_val, 4),
                "std": round(std_val, 4),
                "iqr": round(iqr_val, 4),
                "skewness": skew_val,
                "histogram_bins": histogram_bins,
            }
        except Exception as e:
            raise DecisionOSException(
                error_code="DUCKDB_DISTRIBUTION_FAILED",
                message=f"Distribution calculation failed: {str(e)}",
            )
        finally:
            conn.close()

    @classmethod
    def compute_outliers(
        cls,
        file_path: str,
        file_type: str,
        column: str,
        method: str = "IQR",
        limit: int = 50,
    ) -> Dict[str, Any]:
        """
        Identify anomalous rows using Tukey IQR (1.5*IQR) or Z-score (|z| > 3.0) boundaries.
        """
        stats = cls.compute_distribution_stats(file_path, file_type, column)
        q1_val = stats["q1"]
        q3_val = stats["q3"]
        iqr_val = stats["iqr"]
        mean_val = stats["mean"]
        std_val = stats["std"]

        method_upper = method.upper()
        if method_upper == "ZSCORE" and std_val > 0:
            lower_bound = mean_val - 3.0 * std_val
            upper_bound = mean_val + 3.0 * std_val
        else:
            method_upper = "IQR"
            lower_bound = q1_val - 1.5 * iqr_val
            upper_bound = q3_val + 1.5 * iqr_val

        table_expr = cls._get_table_expression(file_path, file_type)
        conn = duckdb.connect(database=":memory:", read_only=False)
        try:
            if file_type == DatasetFileType.EXCEL.value:
                df = pd.read_excel(file_path)
                conn.register("excel_dataset_view", df)

            count_sql = f"""
                SELECT COUNT(*) FROM {table_expr}
                WHERE "{column}" IS NOT NULL AND ("{column}" < {lower_bound} OR "{column}" > {upper_bound})
            """
            total_outliers = int(conn.execute(count_sql).fetchone()[0])

            total_sql = f'SELECT COUNT(*) FROM {table_expr} WHERE "{column}" IS NOT NULL'
            total_rows = int(conn.execute(total_sql).fetchone()[0])

            sample_sql = f"""
                SELECT * FROM {table_expr}
                WHERE "{column}" IS NOT NULL AND ("{column}" < {lower_bound} OR "{column}" > {upper_bound})
                LIMIT {limit}
            """
            result_df = conn.execute(sample_sql).df()
            result_df = result_df.where(pd.notnull(result_df), None)
            sample_outliers = result_df.to_dict(orient="records")

            outlier_pct = round((total_outliers / total_rows) * 100.0, 2) if total_rows > 0 else 0.0

            return {
                "column": column,
                "method": method_upper,
                "lower_bound": round(lower_bound, 4),
                "upper_bound": round(upper_bound, 4),
                "total_outliers": total_outliers,
                "outlier_percentage": outlier_pct,
                "sample_outliers": sample_outliers,
            }
        except Exception as e:
            raise DecisionOSException(
                error_code="DUCKDB_OUTLIER_FAILED",
                message=f"Outlier detection failed: {str(e)}",
            )
        finally:
            conn.close()

    @classmethod
    def aggregate_time_series(
        cls,
        file_path: str,
        file_type: str,
        date_column: str,
        target_column: str,
        agg_fn: str = "SUM",
        frequency: str = "M",
    ) -> List[Dict[str, Any]]:
        """
        Natively resample and aggregate a time series inside DuckDB across a specified frequency
        ('D', 'W', 'M', 'Q', 'Y').
        """
        table_expr = cls._get_table_expression(file_path, file_type)
        conn = duckdb.connect(database=":memory:", read_only=False)
        try:
            if file_type == DatasetFileType.EXCEL.value:
                df = pd.read_excel(file_path)
                conn.register("excel_dataset_view", df)

            freq_map = {
                "D": "day",
                "DAILY": "day",
                "W": "week",
                "WEEKLY": "week",
                "M": "month",
                "MONTHLY": "month",
                "Q": "quarter",
                "QUARTERLY": "quarter",
                "Y": "year",
                "YEARLY": "year",
            }
            trunc_unit = freq_map.get(frequency.upper(), "month")
            valid_aggs = {"SUM", "AVG", "COUNT", "MAX", "MIN"}
            agg_upper = agg_fn.upper() if agg_fn.upper() in valid_aggs else "SUM"

            sql = f"""
            SELECT
                strftime(date_trunc('{trunc_unit}', CAST("{date_column}" AS TIMESTAMP)), '%Y-%m-%d') AS period_date,
                ROUND({agg_upper}(CAST("{target_column}" AS DOUBLE)), 4) AS target_value
            FROM {table_expr}
            WHERE "{date_column}" IS NOT NULL AND "{target_column}" IS NOT NULL
            GROUP BY 1
            ORDER BY 1 ASC
            """
            rows = conn.execute(sql).fetchall()
            series = []
            for r in rows:
                if r[0] is not None and r[1] is not None:
                    series.append({"date": str(r[0]), "value": float(r[1])})
            return series
        except Exception as e:
            raise DecisionOSException(
                error_code="DUCKDB_TIME_SERIES_FAILED",
                message=f"Time-series aggregation failed: {str(e)}",
            )
        finally:
            conn.close()

    @classmethod
    def get_available_time_series_columns(
        cls, file_path: str, file_type: str
    ) -> Dict[str, List[str]]:
        """
        Inspect dataset columns to identify candidate date/time index columns and numeric KPI columns.
        """
        table_expr = cls._get_table_expression(file_path, file_type)
        conn = duckdb.connect(database=":memory:", read_only=False)
        try:
            if file_type == DatasetFileType.EXCEL.value:
                df = pd.read_excel(file_path)
                conn.register("excel_dataset_view", df)

            desc_rows = conn.execute(f"DESCRIBE SELECT * FROM {table_expr}").fetchall()
            date_cols = []
            numeric_cols = []
            for col_name, col_type, *_ in desc_rows:
                type_upper = str(col_type).upper()
                col_lower = str(col_name).lower()
                if any(t in type_upper for t in ["DATE", "TIME", "TIMESTAMP"]) or any(
                    w in col_lower
                    for w in [
                        "date",
                        "time",
                        "day",
                        "month",
                        "year",
                        "created",
                        "timestamp",
                    ]
                ):
                    date_cols.append(col_name)
                elif any(
                    num_type in type_upper
                    for num_type in [
                        "INT",
                        "DOUBLE",
                        "FLOAT",
                        "DECIMAL",
                        "NUMERIC",
                        "REAL",
                        "BIGINT",
                        "SMALLINT",
                    ]
                ):
                    numeric_cols.append(col_name)

            if not date_cols and len(desc_rows) > 0:
                date_cols.append(desc_rows[0][0])

            return {"date_columns": date_cols, "numeric_columns": numeric_cols}
        except Exception as e:
            raise DecisionOSException(
                error_code="DUCKDB_METADATA_FAILED",
                message=f"Failed to inspect time-series columns: {str(e)}",
            )
        finally:
            conn.close()



