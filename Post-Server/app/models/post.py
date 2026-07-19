from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING
from sqlalchemy import Boolean, DateTime, Enum, String, Text, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.enums.post_visibility import PostVisibility

if TYPE_CHECKING:
    from app.models.post_media import PostMedia
    from app.models.post_like import PostLike
    from app.models.post_comment import PostComment


class Post(Base):
    """
    Represents a user post containing media and captions.
    """
    __tablename__ = "posts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        comment="Unique identifier for the post"
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
        comment="Owner of the post (references User UUID)"
    )
    caption: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
        comment="Caption text written for the post"
    )
    location: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        comment="Optional tagged location of the post"
    )
    visibility: Mapped[PostVisibility] = mapped_column(
        Enum(PostVisibility, name="postvisibility", schema="post_schema"),
        default=PostVisibility.PUBLIC,
        nullable=False,
        comment="Privacy visibility category of the post"
    )
    comments_enabled: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        comment="Flag indicating if comment creation is enabled"
    )
    media_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        comment="Cached count of media files in this post"
    )
    
    is_deleted: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        comment="Soft delete flag"
    )
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="Timestamp when post was soft deleted"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        comment="Timestamp when post was created"
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
        comment="Timestamp when post was last updated"
    )

    __table_args__ = (
        {"schema": "post_schema"},
    )

    # Relationships
    media: Mapped[list[PostMedia]] = relationship(
        "PostMedia",
        back_populates="post",
        cascade="all, delete-orphan"
    )
    likes: Mapped[list[PostLike]] = relationship(
        "PostLike",
        back_populates="post",
        cascade="all, delete-orphan"
    )
    comments: Mapped[list[PostComment]] = relationship(
        "PostComment",
        back_populates="post",
        cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Post id={self.id} user_id={self.user_id} visibility={self.visibility}>"
