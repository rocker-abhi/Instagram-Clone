from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.post import Post


class PostComment(Base):
    """
    Represents a comment or a nested comment reply on a user post.
    """
    __tablename__ = "post_comments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        comment="Unique identifier for the comment"
    )
    post_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("post_schema.posts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Foreign key referencing the associated Post"
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        comment="Foreign key referencing the User who authored the comment"
    )
    parent_comment_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("post_schema.post_comments.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
        comment="Optional self-referencing foreign key for nested comment replies"
    )
    content: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        comment="The text content of the comment"
    )
    like_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        comment="Cached count of likes for this comment"
    )
    reply_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        comment="Cached count of nested replies to this comment"
    )
    is_edited: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        comment="Flag indicating if the comment was edited"
    )
    edited_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="Timestamp when comment content was last edited"
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
        comment="Timestamp when comment was soft deleted"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        comment="Timestamp when comment was created"
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
        comment="Timestamp when comment was last updated"
    )

    __table_args__ = (
        {"schema": "post_schema"},
    )

    # Relationships
    post: Mapped[Post] = relationship(
        "Post",
        back_populates="comments"
    )
    parent_comment: Mapped[PostComment | None] = relationship(
        "PostComment",
        remote_side=[id],
        back_populates="replies"
    )
    replies: Mapped[list[PostComment]] = relationship(
        "PostComment",
        back_populates="parent_comment",
        cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<PostComment id={self.id} post_id={self.post_id} user_id={self.user_id}>"
