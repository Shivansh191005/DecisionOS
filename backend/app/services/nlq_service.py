"""
Service layer for Module 6: NLQ-to-SQL (Natural Language to SQL Engine & AI Data Assistant).
"""
import re
import time
import uuid
from typing import Any, Dict, List, Optional, Tuple

import duckdb
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestException, DecisionOSException
from app.models.dataset import Dataset
from app.models.nlq import NLQBookmark
from app.schemas.nlq import NLQAskResponse, NLQBookmarkResponse
from app.services.duckdb_engine import DuckDBEngine
from app.services.llm_service import LLMService


class NLQService:
    """
    Semantic Layer & Conversational Text-to-SQL Engine:
    - Parses natural language questions into deterministic, safe DuckDB SQL queries.
    - Scans SQL statements for safety (SELECT-only restriction).
    - Recommends optimal visualization chart types (LINE_CHART, BAR_CHART, PIE_CHART, KPI_CARD, DATA_TABLE).
    - Generates natural language AI executive summaries.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    @staticmethod
    def validate_sql_safety(sql: str) -> None:
        """
        Enforce strict read-only SQL AST safety:
        - Must start with SELECT
        - Must not contain forbidden modification/system keywords.
        """
        cleaned = sql.strip()
        if not re.match(r"^(WITH\s+.*)?SELECT\b", cleaned, re.IGNORECASE | re.DOTALL):
            raise DecisionOSException(
                error_code="UNSAFE_SQL_QUERY",
                message="Only SELECT queries are permitted in natural language data exploration.",
            )

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
            "EXEC",
            "EXECUTE",
            "GRANT",
            "REVOKE",
        ]
        for kw in forbidden_keywords:
            if re.search(rf"\b{kw}\b", cleaned, re.IGNORECASE):
                raise DecisionOSException(
                    error_code="UNSAFE_SQL_QUERY",
                    message=f"SQL query contains forbidden keyword '{kw}'. Modification operations are blocked.",
                )

    @classmethod
    def _synthesize_sql_query(
        cls,
        question: str,
        date_cols: List[str],
        numeric_cols: List[str],
        all_cols: List[str],
        table_expr: str,
    ) -> Tuple[str, str, str, str, str]:
        """
        Synthesize plain-English question tokens into optimized DuckDB SQL.
        Returns:
            (sql_query, group_type, target_col, agg_fn, group_col_or_expr)
        """
        q_lower = question.lower()

        # 1. Determine Aggregation Function
        agg_fn = "SUM"
        if any(w in q_lower for w in ["average", "avg", "mean"]):
            agg_fn = "AVG"
        elif any(w in q_lower for w in ["count", "number of", "how many", "volume"]):
            agg_fn = "COUNT"
        elif any(w in q_lower for w in ["max", "highest value", "maximum", "peak"]):
            agg_fn = "MAX"
        elif any(w in q_lower for w in ["min", "lowest value", "minimum", "trough"]):
            agg_fn = "MIN"

        # 2. Determine Target KPI Column
        target_col = None
        for col in numeric_cols:
            if col.lower() in q_lower:
                target_col = col
                break
        if not target_col:
            target_col = numeric_cols[0] if numeric_cols else (all_cols[0] if all_cols else "*")

        # 3. Determine Grouping Dimension (Date vs. Categorical)
        group_type = "NONE"
        group_col_or_expr = ""
        categorical_cols = [c for c in all_cols if c not in numeric_cols and c not in date_cols]

        # Check Date Grouping first
        date_match = False
        if date_cols and any(
            w in q_lower
            for w in [
                "month",
                "monthly",
                "year",
                "yearly",
                "annual",
                "daily",
                "date",
                "day",
                "over time",
                "trend",
                "history",
            ]
        ):
            date_col = date_cols[0]
            for col in date_cols:
                if col.lower() in q_lower:
                    date_col = col
                    break

            date_match = True
            group_type = "DATE"
            if "year" in q_lower or "annual" in q_lower:
                group_col_or_expr = (
                    f"strftime(date_trunc('Y', CAST(\"{date_col}\" AS TIMESTAMP)), '%Y') AS period_year"
                )
            elif "month" in q_lower or "monthly" in q_lower or "over time" in q_lower or "trend" in q_lower:
                group_col_or_expr = (
                    f"strftime(date_trunc('M', CAST(\"{date_col}\" AS TIMESTAMP)), '%Y-%m-%d') AS period_month"
                )
            else:
                group_col_or_expr = (
                    f"strftime(date_trunc('D', CAST(\"{date_col}\" AS TIMESTAMP)), '%Y-%m-%d') AS period_date"
                )

        # If not date, check Categorical Dimension
        if not date_match and categorical_cols:
            for col in categorical_cols:
                if col.lower() in q_lower or f"by {col.lower()}" in q_lower:
                    group_type = "CATEGORICAL"
                    group_col_or_expr = col
                    break
            # Check general words like "by region", "by category", etc.
            if group_type == "NONE" and "by " in q_lower:
                group_type = "CATEGORICAL"
                group_col_or_expr = categorical_cols[0]

        # 4. Determine Ordering Direction
        order_dir = "DESC"
        if any(w in q_lower for w in ["bottom", "lowest", "worst", "ascending", "min"]):
            order_dir = "ASC"

        # 5. Determine LIMIT
        limit_val = 100
        limit_match = re.search(r"\b(top|bottom|first)\s+(\d+)\b", q_lower)
        if limit_match:
            limit_val = int(limit_match.group(2))
        elif group_type == "CATEGORICAL":
            limit_val = 10  # clean default for top categories

        # 6. Build Final DuckDB SQL Query
        if group_type == "DATE":
            sql_query = (
                f"SELECT {group_col_or_expr}, "
                f"ROUND({agg_fn}(CAST(\"{target_col}\" AS DOUBLE)), 4) AS {target_col}_{agg_fn.lower()} "
                f"FROM {table_expr} "
                f"GROUP BY 1 "
                f"ORDER BY 1 ASC "
                f"LIMIT {limit_val}"
            )
        elif group_type == "CATEGORICAL":
            sql_query = (
                f"SELECT \"{group_col_or_expr}\", "
                f"ROUND({agg_fn}(CAST(\"{target_col}\" AS DOUBLE)), 4) AS {target_col}_{agg_fn.lower()} "
                f"FROM {table_expr} "
                f"GROUP BY \"{group_col_or_expr}\" "
                f"ORDER BY {target_col}_{agg_fn.lower()} {order_dir} "
                f"LIMIT {limit_val}"
            )
        else:
            # Global Aggregate KPI Card
            sql_query = (
                f"SELECT ROUND({agg_fn}(CAST(\"{target_col}\" AS DOUBLE)), 4) AS {target_col}_{agg_fn.lower()} "
                f"FROM {table_expr}"
            )

        return sql_query, group_type, target_col, agg_fn, group_col_or_expr

    @staticmethod
    def _recommend_chart_type(
        columns: List[str],
        rows: List[Dict[str, Any]],
        group_type: str,
    ) -> str:
        """
        Determine optimal visualization chart type based on semantic grouping and result shape.
        """
        if len(rows) == 1 and len(columns) == 1:
            return "KPI_CARD"
        if group_type == "DATE":
            return "LINE_CHART"
        if group_type == "CATEGORICAL":
            if len(rows) <= 4:
                return "PIE_CHART"
            return "BAR_CHART"
        return "DATA_TABLE"

    @staticmethod
    def _synthesize_ai_answer(
        question: str,
        columns: List[str],
        rows: List[Dict[str, Any]],
        group_type: str,
        target_col: str,
        agg_fn: str,
        chart_type: str,
    ) -> str:
        """
        Synthesize natural-language executive summary of the analytical answer.
        """
        if not rows:
            return f"No matching records found for '{question}'."

        if chart_type == "KPI_CARD":
            val = rows[0].get(columns[0], "—")
            val_str = f"{val:,.2f}" if isinstance(val, (int, float)) else str(val)
            return f"The **{agg_fn}** of **{target_col}** across the dataset is **{val_str}**."

        if chart_type == "LINE_CHART":
            n_periods = len(rows)
            num_vals = [r[columns[1]] for r in rows if isinstance(r.get(columns[1]), (int, float))]
            if num_vals:
                peak_val = max(num_vals)
                avg_val = sum(num_vals) / len(num_vals)
                return (
                    f"Historical trajectory analysis for **{target_col}** across **{n_periods} time periods** "
                    f"shows a peak of **{peak_val:,.2f}** and an average period value of **{avg_val:,.2f}**."
                )
            return f"Time-series trend for **{target_col}** across **{n_periods} periods**."

        if chart_type in ["BAR_CHART", "PIE_CHART"]:
            top_row = rows[0]
            cat_val = top_row.get(columns[0], "Unknown")
            num_val = top_row.get(columns[1], 0)
            num_str = f"{num_val:,.2f}" if isinstance(num_val, (int, float)) else str(num_val)
            return (
                f"Categorical ranking across **{columns[0]}** highlights **{cat_val}** as the leading segment "
                f"with a **{agg_fn} {target_col}** of **{num_str}** across {len(rows)} categories."
            )

        return f"Tabular analytical results containing **{len(rows)} records** across **{len(columns)} columns**."

    async def ask_question(
        self,
        dataset: Dataset,
        question: str,
    ) -> NLQAskResponse:
        """
        End-to-end Ask Data workflow:
        1. Inspect schema metadata (date & numeric columns).
        2. Synthesize safe DuckDB SQL query.
        3. Validate AST safety.
        4. Execute DuckDB query & measure latency.
        5. Recommend chart visualization & synthesize plain-English narrative.
        """
        start_time = time.perf_counter()

        # 1. Discover columns via DuckDB metadata
        file_path = dataset.storage_path
        file_type = dataset.file_type
        table_expr = DuckDBEngine._get_table_expression(file_path, file_type)

        cols_info = DuckDBEngine.get_available_time_series_columns(file_path, file_type)
        date_cols = cols_info.get("date_columns", [])
        numeric_cols = cols_info.get("numeric_columns", [])

        # Get all column names from DuckDB DESCRIBE
        conn = duckdb.connect(database=":memory:", read_only=False)
        desc_rows = conn.execute(f"DESCRIBE SELECT * FROM {table_expr}").fetchall()
        all_cols = [str(r[0]) for r in desc_rows]
        conn.close()

        # 2. Synthesize SQL Query
        sql_query, group_type, target_col, agg_fn, _ = self._synthesize_sql_query(
            question=question,
            date_cols=date_cols,
            numeric_cols=numeric_cols,
            all_cols=all_cols,
            table_expr=table_expr,
        )

        # 3. Validate SQL Safety
        self.validate_sql_safety(sql_query)

        # 4. Execute Query in DuckDB Engine
        result = DuckDBEngine.execute_analytical_query(
            file_path=file_path,
            file_type=file_type,
            sql_query=sql_query,
        )

        exec_ms = round((time.perf_counter() - start_time) * 1000.0, 2)
        columns = result.get("columns", [])
        rows = result.get("rows", [])

        # 5. Determine Chart & AI Answer
        chart_type = self._recommend_chart_type(columns, rows, group_type)

        # Try high-speed Groq Llama-3.3-70B first, fallback to local rule engine
        ai_answer = await LLMService.generate_nlq_answer(
            question=question,
            sql_query=sql_query,
            columns=columns,
            sample_results=rows,
        )
        if not ai_answer:
            ai_answer = self._synthesize_ai_answer(
                question=question,
                columns=columns,
                rows=rows,
                group_type=group_type,
                target_col=target_col,
                agg_fn=agg_fn,
                chart_type=chart_type,
            )

        return NLQAskResponse(
            question=question,
            generated_sql=sql_query,
            execution_time_ms=exec_ms,
            recommended_chart_type=chart_type,
            columns=columns,
            rows=rows,
            ai_answer=ai_answer,
        )

    async def list_bookmarks(self, dataset_id: uuid.UUID) -> List[NLQBookmarkResponse]:
        """Fetch all saved NLQ bookmarks for a dataset, ordered most recent first."""
        stmt = (
            select(NLQBookmark)
            .where(NLQBookmark.dataset_id == dataset_id)
            .order_by(NLQBookmark.created_at.desc())
        )
        result = await self.db.execute(stmt)
        bookmarks = result.scalars().all()
        return [NLQBookmarkResponse.model_validate(b) for b in bookmarks]

    async def save_bookmark(
        self,
        dataset_id: uuid.UUID,
        workspace_id: uuid.UUID,
        question: str,
        generated_sql: str,
        chart_type: str,
    ) -> NLQBookmarkResponse:
        """Create and persist a new NLQ bookmark."""
        bookmark = NLQBookmark(
            dataset_id=dataset_id,
            workspace_id=workspace_id,
            question=question,
            generated_sql=generated_sql,
            chart_type=chart_type,
        )
        self.db.add(bookmark)
        await self.db.commit()
        await self.db.refresh(bookmark)
        return NLQBookmarkResponse.model_validate(bookmark)

    async def delete_bookmark(self, bookmark_id: uuid.UUID) -> bool:
        """Delete a saved bookmark by ID."""
        stmt = select(NLQBookmark).where(NLQBookmark.id == bookmark_id)
        result = await self.db.execute(stmt)
        bookmark = result.scalar_one_or_none()
        if not bookmark:
            raise BadRequestException(f"Bookmark '{bookmark_id}' not found.")
        await self.db.delete(bookmark)
        await self.db.commit()
        return True
