from dataclasses import asdict
import logging

from app.exceptions.business_exception import UserAlreadyExists
from app.kafka.events.user_registered import UserRegisteredEventBuilder
from app.models.user import User
from app.routes.strategy.user_registeration.interface import (
    UserRegisterationInterface,
)
from app.utils.password import hash_password


logger = logging.getLogger(__name__)


class EmailRegisteration(UserRegisterationInterface):

    def __init__(self, builder):
        self.request_data = builder._request_data
        self.user_repository = builder._user_repository
        self.kafka = builder._kafka
        self.redis = builder._redis
        self.strategy_type = builder._strategy_type

    async def register(self) -> dict:
        # Check if email already exists
        existing_email = await self.user_repository.get_user_by_email(
            self.request_data.email
        )
        if existing_email:
            raise UserAlreadyExists("Email is already registered.")

        # Hash password and create user
        pwd_hash = hash_password(self.request_data.password)
        user = User(
            username=self.request_data.username,
            password_hash=pwd_hash,
            email=self.request_data.email,
        )
        created_user = await self.user_repository.create_user(user)

        # Publish event
        try:
            created_user.registration_method = "email"
            event = UserRegisteredEventBuilder.build(created_user)
            self.kafka.publish(topic="user.registered", message=asdict(event))
        except Exception as e:
            logger.error("Failed to publish email registration event: %s", str(e))

        return {
            "id": created_user.id,
            "username": created_user.username,
            "email": created_user.email,
            "phone": created_user.phone,
        }