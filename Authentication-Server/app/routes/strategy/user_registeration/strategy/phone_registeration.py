from dataclasses import asdict
import logging

from app.exceptions.business_exception import UserAlreadyExists, PhoneNumberAlreadyExists
from app.kafka.events.user_registered import UserRegisteredEventBuilder
from app.models.user import User
from app.routes.strategy.user_registeration.interface import (
    UserRegisterationInterface,
)
from app.utils.password import hash_password

logger = logging.getLogger(__name__)


class PhoneRegisteration(UserRegisterationInterface):

    def __init__(self, builder):
        self.request_data = builder._request_data
        self.user_repository = builder._user_repository
        self.kafka = builder._kafka
        self.redis = builder._redis
        self.strategy_type = builder._strategy_type
    async def register(self) -> dict:
        # Check if phone already exists

        logger.debug(f"verify phone details : {self.request_data}")

        existing_phone = await self.user_repository.get_user_by_phone(
            self.request_data.phone
        )

        if existing_phone:
            raise PhoneNumberAlreadyExists()

        existing_username = await self.user_repository.get_user_by_username(
            self.request_data.username
        )
        if existing_username:
            raise UserAlreadyExists()

        # Hash password and create user
        pwd_hash = hash_password(self.request_data.password)

        user = User(
            username=self.request_data.username,
            password_hash=pwd_hash,
            phone=self.request_data.phone,
            is_phone_verified=True
        )

        logger.debug(f"verify user details : {user}")
        created_user = await self.user_repository.create_user(user)
        logger.debug(f"verify created user details : {created_user}")
        
        # response 
        
        return {
            "id": created_user.id,
            "username": created_user.username,
            "email": created_user.email,
            "phone": created_user.phone,
        }
