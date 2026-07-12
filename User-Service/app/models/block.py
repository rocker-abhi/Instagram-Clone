from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING
from sqlalchemy import DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.user_profile import UserProfile


class Block(Base):
    """
    Represents account block restrictions between user profiles.
    """
    __tablename__ = "blocks"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        comment="Unique identifier for the block restriction record"
    )
    blocker_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("user_schema.user_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Foreign key referencing the UserProfile who issued the block"
    )
    blocked_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("user_schema.user_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Foreign key referencing the target UserProfile being blocked"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        comment="Timestamp when block action occurred"
    )

    __table_args__ = (
        UniqueConstraint("blocker_id", "blocked_user_id", name="uq_blocker_blocked"),
        {"schema": "user_schema"},
    )

    # Relationships
    blocker: Mapped[UserProfile] = relationship(
        "UserProfile",
        foreign_keys=[blocker_id],
        back_populates="blocked_users"
    )
    blocked_user: Mapped[UserProfile] = relationship(
        "UserProfile",
        foreign_keys=[blocked_user_id],
        back_populates="blocked_by"
    )

    def __repr__(self) -> str:
        return f"<Block id={self.id} blocker_id={self.blocker_id} blocked_user_id={self.blocked_user_id}>"
