from dataclasses import asdict
import logging

from app.exceptions.business_exception import UserAlreadyExists
from app.kafka.events.user_registered import UserRegisteredEventBuilder
from app.models.user import User
from app.routes.strategy.user_registeration.interface import (
    UserRegisterationInterface,
)
from app.utils.password import hash_password
from app.exceptions.business_exception import EmailAlreadyExists

from app.utils.otp import generate_otp
from app.redis.factory.factory import get_store
from app.redis.enum.store_enum import StoreEnums

from app.kafka.topics import KafakTopics

logger = logging.getLogger(__name__)


class EmailRegisteration(UserRegisterationInterface):

    def __init__(self, builder):
        self.request_data = builder._request_data
        self.user_repository = builder._user_repository
        self.kafka = builder._kafka
        self.redis = builder._redis
        self.strategy_type = builder._strategy_type

    async def register(self):
        logger.debug(f"Registering User : info -> {self.request_data}")
        # Check if email already exists
        existing_email = await self.user_repository.get_user_by_email(
            self.request_data.email
        )

        if existing_email:
            logger.debug(f"Email Already Exists : info -> {existing_email}")
            raise EmailAlreadyExists()

        existing_user = await self.user_repository.get_user_by_username(
            self.request_data.username
        )
        if existing_user:
            logger.debug(f"User Already Exists : info -> {existing_user}")
            raise UserAlreadyExists()

        pwd_hash = hash_password(self.request_data.password)

        user = User(
            username=self.request_data.username,
            password_hash=pwd_hash,
            email=self.request_data.email,
        )

        created_user = await self.user_repository.create_user(user)
        logger.debug("User successfully created.")

        # generate otp
        otp = generate_otp()
        logger.debug(f"OTP : {otp}")

        # store otp in redis database
        redis_store = get_store(self.redis, StoreEnums.EMAIL_VERIFICATION)
        await redis_store.set(str(user.id), str(otp))
        logger.debug("Storing OTP in the redis store.")

        
        try:
            # publish an event
            event = (
                UserRegisteredEventBuilder()
                .set_email(self.request_data.email)
                .set_phone(self.request_data.phone)
                .set_registration_method(self.strategy_type)
                .set_user_id(created_user.id)
                .set_username(created_user.username)
                .set_otp(otp)
                .build()
            )
            self.kafka.publish(topic=KafakTopics.USER_REGISTERED, message=asdict(event))
        except Exception as e:
            logger.error("Failed to publish email registration event: %s", str(e))

        return 