from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING
from sqlalchemy import DateTime, Enum, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.enums.follow_status import FollowStatus

if TYPE_CHECKING:
    from app.models.user_profile import UserProfile


class Follow(Base):
    """
    Represents follow relationships between user profiles.
    """
    __tablename__ = "follows"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        comment="Unique identifier for the follow relationship record"
    )
    follower_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("user_schema.user_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Foreign key referencing the UserProfile executing the follow action"
    )
    following_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("user_schema.user_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Foreign key referencing the target UserProfile being followed"
    )
    status: Mapped[FollowStatus] = mapped_column(
        Enum(FollowStatus, name="followstatus", schema="user_schema"),
        default=FollowStatus.ACCEPTED,
        nullable=False,
        comment="State of follow relationship (PENDING for private accounts, ACCEPTED for public)"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        comment="Timestamp when follow action was executed"
    )

    __table_args__ = (
        UniqueConstraint("follower_id", "following_id", name="uq_follower_following"),
        {"schema": "user_schema"},
    )

    # Relationships
    follower: Mapped[UserProfile] = relationship(
        "UserProfile",
        foreign_keys=[follower_id],
        back_populates="following"
    )
    following: Mapped[UserProfile] = relationship(
        "UserProfile",
        foreign_keys=[following_id],
        back_populates="followers"
    )

    def __repr__(self) -> str:
        return f"<Follow id={self.id} follower_id={self.follower_id} following_id={self.following_id} status={self.status}>"
