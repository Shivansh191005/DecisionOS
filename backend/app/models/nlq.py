"""
SQLAlchemy 2.0 Async model representing a saved Natural Language Question & SQL query bookmark.
"""
from typing import Optional
import uuid

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import UUIDModel, TimestampMixin


class NLQBookmark(UUIDModel, TimestampMixin):
    """
    Represents a bookmarked natural language query and its synthesized DuckDB SQL query,
    enabling instant re-execution and shared analytical bookmarks across workspace datasets.
    """

    __tablename__ = "nlq_bookmarks"

    dataset_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("datasets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    question: Mapped[str] = mapped_column(
        String(512),
        nullable=False,
    )
    generated_sql: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    chart_type: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        default="DATA_TABLE",
    )

    # Relationships
    dataset = relationship("Dataset", backref="nlq_bookmarks", lazy="selectin")
    workspace = relationship("Workspace", backref="nlq_bookmarks", lazy="selectin")

    def __repr__(self) -> str:
        return f"<NLQBookmark id={self.id} question='{self.question}' chart='{self.chart_type}'>"
