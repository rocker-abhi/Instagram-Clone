from dataclasses import dataclass
from datetime import datetime, UTC
from uuid import uuid4


@dataclass
class __UserRegisteredEvent:

    event_id: str
    user_id: str
    username: str
    email: str | None
    phone: str | None

    registration_method: str

    event_type: str
    source: str
    occurred_at: str


class UserRegisteredEventBuilder:

    @staticmethod
    def build(user) -> __UserRegisteredEvent:
        return __UserRegisteredEvent(
            event_id=str(uuid4()),
            user_id=user.user_id,
            username=user.username,
            email=user.email,
            phone=user.phone,
            registration_method=user.registration_method,
            event_type="user.registered",
            source="authentication-server",
            occurred_at=datetime.now(UTC).isoformat(),
        )