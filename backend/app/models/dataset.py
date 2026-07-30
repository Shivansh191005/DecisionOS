"""
Dataset Domain Entity for DecisionOS Module 2: Data Ingestion & Pipelines.
Stores uploaded dataset metadata, DuckDB storage path, and inferred statistical schema profiles.
"""
import uuid
from enum import Enum as PyEnum
from typing import Any, Dict, Optional

from sqlalchemy import (
    BigInteger,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import TimestampMixin, UUIDModel


class DatasetFileType(str, PyEnum):
    """Supported file upload formats."""

    CSV = "CSV"
    EXCEL = "EXCEL"
    JSON = "JSON"
    PARQUET = "PARQUET"


class DatasetStatus(str, PyEnum):
    """Lifecycle state of an uploaded dataset."""

    UPLOADING = "UPLOADING"
    PROCESSING = "PROCESSING"
    READY = "READY"
    ERROR = "ERROR"


class Dataset(UUIDModel, TimestampMixin):
    """
    SQLAlchemy 2.0 Async model representing an uploaded data file and its schema metadata.
    Scoped to a specific tenant workspace via workspace_id.
    """

    __tablename__ = "datasets"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    file_type: Mapped[str] = mapped_column(
        String(50), default=DatasetFileType.CSV.value, nullable=False
    )
    storage_path: Mapped[str] = mapped_column(String(1024), nullable=False)

    # Profiling & Schema stats
    row_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    column_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    schema_metadata: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSONB, nullable=True
    )

    status: Mapped[str] = mapped_column(
        String(50), default=DatasetStatus.UPLOADING.value, nullable=False, index=True
    )
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    workspace: Mapped["Workspace"] = relationship(
        "Workspace", back_populates="datasets"
    )

    def __repr__(self) -> str:
        return (
            f"<Dataset id={self.id} name='{self.name}' status='{self.status}' "
            f"rows={self.row_count} cols={self.column_count}>"
        )
