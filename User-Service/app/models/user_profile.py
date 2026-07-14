from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING
from sqlalchemy import Boolean, DateTime, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.privacy_setting import PrivacySetting
    from app.models.follow import Follow
    from app.models.block import Block


class UserProfile(Base):
    """
    Represents the public profile information of a user.
    """
    __tablename__ = "user_profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        comment="Unique identifier for the user profile"
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        unique=True,
        nullable=False,
        index=True,
        comment="Unique ID referencing the core Auth Service User record"
    )
    username: Mapped[str] = mapped_column(
        String(30),
        unique=True,
        nullable=False,
        index=True,
        comment="Instagram username handle used for search and routing"
    )
    display_name: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
        comment="Full displayed profile name of the user"
    )
    bio: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True,
        comment="Instagram-style bio biography status text (max 150 chars)"
    )
    profile_picture_key: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
        comment="MinIO object key for the user avatar image (e.g. users/{uuid}/avatar.jpg)"
    )
    website: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        comment="Optional external bio portfolio website URL"
    )
    is_onboarding_completed: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        comment="Flag indicating if the user has completed their initial registration onboarding flow"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        comment="Timestamp when user profile record was created"
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
        comment="Timestamp when user profile record was last updated"
    )

    __table_args__ = (
        {"schema": "user_schema"},
    )

    # Relationships
    privacy_setting: Mapped[PrivacySetting] = relationship(
        "PrivacySetting",
        back_populates="user_profile",
        uselist=False,
        cascade="all, delete-orphan",
    )
    followers: Mapped[list[Follow]] = relationship(
        "Follow",
        foreign_keys="[Follow.following_id]",
        back_populates="following",
        cascade="all, delete-orphan",
    )
    following: Mapped[list[Follow]] = relationship(
        "Follow",
        foreign_keys="[Follow.follower_id]",
        back_populates="follower",
        cascade="all, delete-orphan",
    )
    blocked_users: Mapped[list[Block]] = relationship(
        "Block",
        foreign_keys="[Block.blocker_id]",
        back_populates="blocker",
        cascade="all, delete-orphan",
    )
    blocked_by: Mapped[list[Block]] = relationship(
        "Block",
        foreign_keys="[Block.blocked_user_id]",
        back_populates="blocked_user",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<UserProfile id={self.id} username={self.username} is_onboarding_completed={self.is_onboarding_completed}>"
