import uuid
from datetime import datetime, timezone
from sqlalchemy import DateTime, String, Boolean, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Notification(Base):
    """
    Model representing notifications generated within the application.
    """
    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        comment="Unique identifier for the notification"
    )
    receiver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
        comment="UUID of the user receiving the notification"
    )
    actor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
        comment="UUID of the user who performed the action"
    )
    type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment="Type of notification (e.g., follow, like, comment)"
    )
    reference_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
        comment="Optional UUID referencing the associated entity (e.g., post_id, comment_id)"
    )
    message: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
        comment="Text message describing the notification action"
    )
    is_read: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        comment="Flag indicating if the receiver has read the notification"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        comment="Timestamp when the notification was created"
    )

    __table_args__ = (
        {"schema": "notification_schema"},
    )

    def __repr__(self) -> str:
        return f"<Notification id={self.id} receiver_id={self.receiver_id} type={self.type} is_read={self.is_read}>"
