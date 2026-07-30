"""
SQLAlchemy 2.0 Async model representing a non-destructive data cleaning & transformation recipe.
"""
import uuid
from typing import Any, Dict, List, Optional

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import TimestampMixin, UUIDModel


class CleaningRecipe(UUIDModel, TimestampMixin):
    """
    Represents an ordered sequence of non-destructive data transformation steps
    applied to a dataset (e.g. imputation, outlier clipping, derived formulas, type casting).
    """

    __tablename__ = "cleaning_recipes"

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

    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        default="Default Cleaning Recipe",
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        default="",
    )

    # JSONB column storing ordered array of step dictionaries:
    # e.g. [{"type": "IMPUTE_NULL", "column": "revenue", "strategy": "MEAN"}, ...]
    steps: Mapped[List[Dict[str, Any]]] = mapped_column(
        JSONB,
        nullable=False,
        default=list,
    )

    # Relationships
    dataset = relationship("Dataset", backref="cleaning_recipes", lazy="selectin")
    workspace = relationship("Workspace", backref="cleaning_recipes", lazy="selectin")

    def __repr__(self) -> str:
        return f"<CleaningRecipe id={self.id} name='{self.name}' steps={len(self.steps)}>"
