from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING
from sqlalchemy import DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.post import Post


class PostLike(Base):
    """
    Represents a user like registration on a post.
    """
    __tablename__ = "post_likes"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        comment="Unique identifier for the post like record"
    )
    post_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("post_schema.posts.id", ondelete="CASCADE"),
        nullable=False,
        comment="Foreign key referencing the liked Post"
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        comment="Foreign key referencing the User who liked the post"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        comment="Timestamp when user liked the post"
    )

    __table_args__ = (
        UniqueConstraint("post_id", "user_id", name="uq_post_user_like"),
        {"schema": "post_schema"},
    )

    # Relationships
    post: Mapped[Post] = relationship(
        "Post",
        back_populates="likes"
    )

    def __repr__(self) -> str:
        return f"<PostLike id={self.id} post_id={self.post_id} user_id={self.user_id}>"
