import uuid
from datetime import datetime, timezone
from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("chat_schema.conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    sender_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
    )
    message_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="TEXT",
    )
    content: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    reply_to_message_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("chat_schema.messages.id", ondelete="SET NULL"),
        nullable=True,
    )
    is_edited: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )
    deleted_for_everyone: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    __table_args__ = (
        Index("idx_messages_created_at", created_at.desc()),
        {"schema": "chat_schema"},
    )

    # Relationships
    conversation = relationship(
        "Conversation",
        foreign_keys=[conversation_id],
        back_populates="messages",
    )
    reply_to = relationship(
        "Message",
        remote_side=[id],
        foreign_keys=[reply_to_message_id],
    )
    reads = relationship(
        "MessageRead",
        back_populates="message",
        cascade="all, delete-orphan",
    )
    deletions = relationship(
        "DeletedMessage",
        back_populates="message",
        cascade="all, delete-orphan",
    )
