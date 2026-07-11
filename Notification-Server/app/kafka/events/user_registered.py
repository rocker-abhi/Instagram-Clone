from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import uuid4


@dataclass(frozen=True)
class UserRegisteredEvent:
    event_id: str
    user_id: str
    username: str
    email: str | None
    phone: str | None
    registration_method: str
    event_type: str
    source: str
    occurred_at: str
    otp:str


class UserRegisteredEventBuilder:

    def __init__(self):
        self._user_id: str | None = None
        self._username: str | None = None
        self._email: str | None = None
        self._phone: str | None = None
        self._registration_method: str | None = None
        self._event_type: str = "user.registered"
        self._source: str = "authentication-server"
        self._otp: str | None = None

    def set_otp(self, otp: str):
        self._otp = otp
        return self

    def set_user_id(self, user_id):
        self._user_id = str(user_id) if user_id else None
        return self

    def set_username(self, username: str):
        self._username = username
        return self

    def set_email(self, email: str | None):
        self._email = email
        return self

    def set_phone(self, phone: str | None):
        self._phone = phone
        return self

    def set_registration_method(self, registration_method: str):
        self._registration_method = registration_method
        return self

    def set_event_type(self, event_type: str):
        self._event_type = event_type
        return self

    def set_source(self, source: str):
        self._source = source
        return self

    def build(self) -> UserRegisteredEvent:
        return UserRegisteredEvent(
            event_id=str(uuid4()),
            user_id=self._user_id,
            username=self._username,
            email=self._email,
            phone=self._phone,
            registration_method=self._registration_method,
            event_type=self._event_type,
            source=self._source,
            otp=self._otp,
            occurred_at=datetime.now(UTC).isoformat(),
        )