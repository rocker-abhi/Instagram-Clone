from dataclasses import asdict
import logging

from app.exceptions.business_exception import UserAlreadyExists, PhoneNumberAlreadyExists
from app.kafka.events.user_registered import UserRegisteredEventBuilder
from app.models.user import User
from app.strategy.user_registeration.interface import (
    UserRegisterationInterface,
)
from app.utils.password import hash_password
from app.utils.jwt import create_access_token
from app.grpc.client.user_client import UserServiceClient

logger = logging.getLogger(__name__)


class PhoneRegisteration(UserRegisterationInterface):

    def __init__(self, builder):
        self.request_data = builder._request_data
        self.user_repository = builder._user_repository
        self.kafka = builder._kafka
        self.redis = builder._redis
        self.strategy_type = builder._strategy_type

    
    async def register(self):
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
        created_user = await self.user_repository.create_user(user, commit=False)
        logger.debug(f"verify created user details : {created_user}")



        access_token = create_access_token(
            {"sub": str(created_user.id), "username": created_user.username}
        )

        try:
            user_client = UserServiceClient()
            user_client.create_user_profile(
                user_id=str(created_user.id),
                username=created_user.username,
                token=access_token
            )
            # Commit changes to the DB
            await self.user_repository.session.commit()
            await self.user_repository.session.refresh(created_user)
        except Exception as grpc_err:
            logger.error("Failed to create profile via gRPC User-Service. Rolling back user creation. Error: %s", str(grpc_err))
            await self.user_repository.session.rollback()
            raise
        
        # response 
        
        return 
