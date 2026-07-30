"""
Seed a realistic Enterprise SaaS Revenue & Operations dataset into the local database
and filesystem so that all 9 DecisionOS modules can be tested immediately.
"""
import json
import os
import sqlite3
import uuid
from datetime import datetime, timedelta
import pandas as pd

from app.services.profiler_service import ProfilerService


def seed_enterprise_dataset():
    db_path = "decisionos_local.db"
    if not os.path.exists(db_path):
        print("Database not found:", db_path)
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Get main workspace ID
    cursor.execute("SELECT id FROM workspaces WHERE slug = 'main' LIMIT 1")
    row = cursor.fetchone()
    if not row:
        print("Main workspace not found in database.")
        conn.close()
        return
    workspace_id = row[0]

    # Check if we already seeded this dataset
    cursor.execute(
        "SELECT id FROM datasets WHERE workspace_id = ? AND file_name = 'enterprise_saas_metrics_2026.csv'",
        (workspace_id,),
    )
    if cursor.fetchone():
        print("Sample dataset 'enterprise_saas_metrics_2026.csv' already exists.")
        conn.close()
        return

    dataset_id = str(uuid.uuid4()).replace("-", "")
    # Generate 500 rows of realistic enterprise SaaS metrics
    print("Generating 500 rows of enterprise SaaS revenue and operations data...")
    dates = [datetime(2025, 1, 1) + timedelta(days=i) for i in range(500)]
    import random

    random.seed(42)

    data = []
    for d in dates:
        mrr = round(random.uniform(35000, 145000), 2)
        new_cust = random.randint(12, 65)
        churn = round(random.uniform(1.2, 3.8), 2)
        cac = round(random.uniform(1400, 3200), 2)
        ltv = round(random.uniform(18000, 48000), 2)
        mktg = round(random.uniform(12000, 55000), 2)
        reps = random.randint(6, 22)
        region = random.choice(["North America", "EMEA", "APAC"])
        data.append(
            {
                "date": d.strftime("%Y-%m-%d"),
                "mrr_usd": mrr,
                "new_customers": new_cust,
                "churn_rate_pct": churn,
                "cac_usd": cac,
                "ltv_usd": ltv,
                "marketing_spend_usd": mktg,
                "sales_headcount": reps,
                "region": region,
            }
        )

    df = pd.DataFrame(data)

    tenant_dir = os.path.join(".", "storage", "datasets", workspace_id)
    os.makedirs(tenant_dir, exist_ok=True)
    storage_path = os.path.abspath(os.path.join(tenant_dir, f"{dataset_id}.csv"))

    df.to_csv(storage_path, index=False)
    print(f"Saved dataset file to: {storage_path}")

    # Profile dataset using ProfilerService
    print("Profiling dataset with ProfilerService...")
    profile_data = ProfilerService.profile_dataset(
        file_path=storage_path, file_type="CSV"
    )

    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute(
        """
        INSERT INTO datasets (
            workspace_id, name, file_name, file_size_bytes, file_type,
            storage_path, row_count, column_count, schema_metadata, status,
            error_message, id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """,
        (
            workspace_id,
            "Enterprise SaaS Metrics 2026",
            "enterprise_saas_metrics_2026.csv",
            os.path.getsize(storage_path),
            "CSV",
            storage_path,
            profile_data.get("row_count", 500),
            profile_data.get("column_count", 9),
            json.dumps(profile_data),
            "READY",
            None,
            dataset_id,
            now,
            now,
        ),
    )

    conn.commit()
    conn.close()
    print(
        f"Successfully seeded dataset '{dataset_id}' ('Enterprise SaaS Metrics 2026') into workspace '{workspace_id}'."
    )


if __name__ == "__main__":
    seed_enterprise_dataset()
