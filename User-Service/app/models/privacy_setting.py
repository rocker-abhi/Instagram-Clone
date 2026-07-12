from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING
from sqlalchemy import Boolean, DateTime, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.enums.account_visibility import AccountVisibility

if TYPE_CHECKING:
    from app.models.user_profile import UserProfile


class PrivacySetting(Base):
    """
    Represents the user account privacy and preference configurations.
    """
    __tablename__ = "privacy_settings"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        comment="Unique identifier for the privacy setting record"
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("user_schema.user_profiles.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
        comment="Foreign key referencing the associated UserProfile"
    )
    account_visibility: Mapped[AccountVisibility] = mapped_column(
        Enum(AccountVisibility, name="accountvisibility", schema="user_schema"),
        default=AccountVisibility.PUBLIC,
        nullable=False,
        comment="Visibility category setting (PUBLIC or PRIVATE)"
    )
    allow_message_requests: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        comment="Flag indicating if message requests from non-followers are allowed"
    )
    show_activity_status: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        comment="Flag indicating if real-time active status is visible to followers"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        comment="Timestamp when privacy setting was created"
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
        comment="Timestamp when privacy setting was last updated"
    )

    __table_args__ = (
        {"schema": "user_schema"},
    )

    # Relationships
    user_profile: Mapped[UserProfile] = relationship(
        "UserProfile",
        back_populates="privacy_setting"
    )

    def __repr__(self) -> str:
        return f"<PrivacySetting id={self.id} user_id={self.user_id} account_visibility={self.account_visibility}>"
