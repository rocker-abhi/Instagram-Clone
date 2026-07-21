from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy import DateTime, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Story(Base):
    """
    Represents an ephemeral 24-hour story containing an image and optional caption.
    """
    __tablename__ = "stories"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        comment="Unique identifier for the story"
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
        comment="Owner of the story (references User UUID)"
    )
    object_key: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
        comment="MinIO storage object key in temp-media bucket"
    )
    caption: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="Optional caption text for the story"
    )
    mime_type: Mapped[str] = mapped_column(
        String(100),
        default="image/jpeg",
        nullable=False,
        comment="RFC MIME type descriptor"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        comment="Timestamp when story was uploaded"
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc) + timedelta(days=1),
        nullable=False,
        index=True,
        comment="Timestamp when story expires (24 hours after creation)"
    )

    __table_args__ = (
        {"schema": "post_schema"},
    )

    def __repr__(self) -> str:
        return f"<Story id={self.id} user_id={self.user_id} expires_at={self.expires_at}>"
