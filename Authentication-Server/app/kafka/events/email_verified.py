from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import uuid4
from app.kafka.topics import KafakTopics


@dataclass(frozen=True)
class EmailVerifiedEvent:
    event_id: str
    user_id: str
    username: str
    email: str
    event_type: str
    source: str
    occurred_at: str


class EmailVerifiedEventBuilder:

    def __init__(self):
        self._user_id: str | None = None
        self._username: str | None = None
        self._email: str | None = None
        self._event_type: str = KafakTopics.EMAIL_VERIFIED
        self._source: str = "authentication-server"

    def set_user_id(self, user_id):
        self._user_id = str(user_id) if user_id else None
        return self

    def set_username(self, username: str):
        self._username = username
        return self

    def set_email(self, email: str):
        self._email = email
        return self

    def set_event_type(self, event_type: str):
        self._event_type = event_type
        return self

    def set_source(self, source: str):
        self._source = source
        return self

    def build(self) -> EmailVerifiedEvent:
        if not self._user_id or not self._username or not self._email:
            raise ValueError(
                "user_id, username, and email are required to build EmailVerifiedEvent"
            )
        return EmailVerifiedEvent(
            event_id=str(uuid4()),
            user_id=self._user_id,
            username=self._username,
            email=self._email,
            event_type=self._event_type,
            source=self._source,
            occurred_at=datetime.now(UTC).isoformat(),
        )
