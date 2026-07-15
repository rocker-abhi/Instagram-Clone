from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from uuid import uuid4
from app.kafka.topics import KafakTopics


@dataclass(frozen=True)
class NotificationCreatedEvent:
    event_id: str
    receiver_id: str
    actor_id: str
    type: str
    reference_id: str | None
    message: str
    event_type: str
    source: str
    occurred_at: str

    def to_dict(self) -> dict:
        return asdict(self)


class NotificationCreatedEventBuilder:

    def __init__(self):
        self._receiver_id: str | None = None
        self._actor_id: str | None = None
        self._type: str = "general"
        self._reference_id: str | None = None
        self._message: str = ""
        self._event_type: str = KafakTopics.NOTIFICATION_CREATED
        self._source: str = "user-service"

    def set_receiver_id(self, receiver_id):
        self._receiver_id = str(receiver_id) if receiver_id else None
        return self

    def set_actor_id(self, actor_id):
        self._actor_id = str(actor_id) if actor_id else None
        return self

    def set_type(self, type_: str):
        self._type = type_
        return self

    def set_reference_id(self, reference_id):
        self._reference_id = str(reference_id) if reference_id else None
        return self

    def set_message(self, message: str):
        self._message = message
        return self

    def build(self) -> NotificationCreatedEvent:
        if not self._receiver_id:
            raise ValueError("receiver_id is required")
        if not self._actor_id:
            raise ValueError("actor_id is required")

        return NotificationCreatedEvent(
            event_id=str(uuid4()),
            receiver_id=self._receiver_id,
            actor_id=self._actor_id,
            type=self._type,
            reference_id=self._reference_id,
            message=self._message,
            event_type=self._event_type,
            source=self._source,
            occurred_at=datetime.now(timezone.utc).isoformat(),
        )
