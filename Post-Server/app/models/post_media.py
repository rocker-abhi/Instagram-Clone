from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING
from sqlalchemy import BigInteger, DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.enums.media_type import MediaType

if TYPE_CHECKING:
    from app.models.post import Post


class PostMedia(Base):
    """
    Represents a media item (image or video) attached to a user post.
    """
    __tablename__ = "post_media"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        comment="Unique identifier for the media item"
    )
    post_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("post_schema.posts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Foreign key referencing the associated Post"
    )
    media_type: Mapped[MediaType] = mapped_column(
        Enum(MediaType, name="mediatype", schema="post_schema"),
        nullable=False,
        comment="Type category of this media file (IMAGE or VIDEO)"
    )
    object_key: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
        comment="MinIO object key storage path for the original media file"
    )
    thumbnail_key: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
        comment="MinIO object key storage path for the video thumbnail file"
    )
    display_order: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        comment="Ordering position index inside the post gallery carousel"
    )
    mime_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="RFC MIME type category descriptor (e.g. image/jpeg, video/mp4)"
    )
    file_size: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
        comment="Size of the raw binary payload object in bytes"
    )
    width: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
        comment="Pixel width resolution of the media"
    )
    height: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
        comment="Pixel height resolution of the media"
    )
    duration: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
        comment="Duration length of the video file in seconds"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        comment="Timestamp when media upload occurred"
    )

    __table_args__ = (
        {"schema": "post_schema"},
    )

    # Relationships
    post: Mapped[Post] = relationship(
        "Post",
        back_populates="media"
    )

    def __repr__(self) -> str:
        return f"<PostMedia id={self.id} post_id={self.post_id} media_type={self.media_type}>"
