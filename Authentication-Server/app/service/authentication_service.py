import hashlib
from datetime import datetime, timedelta, timezone

from app.exceptions.business_exception import (
    UserNotFound,
    UserAlreadyExists,
)

from app.repository.user_reposiory import UserRepository
from app.schemas.login_schema import LoginRequest, LoginResponseData
from app.schemas.register_schema import RegisterUserRequest, RegisterUserResponseData
from app.utils.jwt import create_access_token, create_refresh_token
from app.utils.password import verify_password, hash_password
from app.kafka.producer import KafkaProducer
from app.strategy.user_registeration.factory import UserRegisterationBuilder, UserRegisterationFactory

from app.redis.factory.factory import get_store
from app.redis.enum.store_enum import StoreEnums
from app.exceptions.business_exception import InvalidVerificationCode, UserNotFound, RepeatedPassword, EmailNotFound, EmailNotVerified, AccountNotVerified, InvalidPassword, InvalidSession, AlreadyLoggedIn
from uuid import uuid4
import json
import uuid
from app.kafka.events.user_password_reset_requested import UserPasswordResetRequestedEventBuilder
from app.kafka.events.user_registered import UserRegisteredEventBuilder
from app.utils.otp import generate_otp
from app.schemas.user_schema import UserSearchResponse, UserSearchResponseData
from app.models.user import User


from app.kafka.events.email_verified import EmailVerifiedEventBuilder
from app.kafka.topics import KafakTopics
from dataclasses import asdict
from app.strategy.reset_password.factory import UserResetPasswordBuilder, UserResetPasswordFactory


class AuthenticationService:

    def __init__(
        self,
        user_repository: UserRepository,
        redis_client,
        kafka_producer: KafkaProducer,
    ):
        self.user_repository = user_repository
        self.redis_client = redis_client
        self.kafka_producer = kafka_producer

    async def login(
        self, login_data: LoginRequest, request_info: dict = None
    ) -> LoginResponseData:
        # Retrieve user from database based on login type
        if login_data.login_type == "email":
            user = await self.user_repository.get_user_by_email(login_data.identifier)
        elif login_data.login_type == "phone":
            user = await self.user_repository.get_user_by_phone(login_data.identifier)
        else:
            user = await self.user_repository.get_user_by_username(login_data.identifier)

        if not user:
            raise UserNotFound("User not found.")

        # Verify password
        if not verify_password(login_data.password, user.password_hash):
            raise InvalidPassword("Invalid password.")

        if user.email and not user.is_email_verified:
            raise AccountNotVerified("Account is not verified. Please verify your email before logging in.")

        # Generate tokens and setup Redis session
        user_id_str = str(user.id)
        sid = uuid.uuid4().hex
        access_token = create_access_token(
            {"sub": user_id_str, "username": user.username, "sid": sid}
        )
        refresh_token = create_refresh_token({"sub": user_id_str, "sid": sid})

        # Store session details in Redis
        session_store = get_store(self.redis_client, StoreEnums.SESSION)
        
        # Check if an active session already exists
        existing_sessions = await session_store.get_user_sessions(user_id_str)
        if existing_sessions:
            if not login_data.force_logout:
                raise AlreadyLoggedIn("User is already logged in on another device.")
            else:
                # Terminate existing sessions
                await session_store.delete_all_user_sessions(user_id_str)

        session_data = {
            "user_id": user_id_str,
            "username": user.username,
            "refresh_token": refresh_token,
            "ip_address": request_info.get("ip_address"),
            "user_agent": request_info.get("user_agent"),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await session_store.set(sid, json.dumps(session_data))
        await session_store.add_user_session(user_id_str, sid)

        return LoginResponseData(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="Bearer",
        )

    async def logout(self, sid: str) -> None:
        session_store = get_store(self.redis_client, StoreEnums.SESSION)
        session_json = await session_store.get(sid)
        if session_json:
            session_data = json.loads(session_json)
            user_id = session_data.get("user_id")
            await session_store.delete(sid)
            if user_id:
                await session_store.remove_user_session(user_id, sid)

    async def refresh_session(self, refresh_token: str, request_info: dict) -> LoginResponseData:
        from app.utils.jwt import decode_token
        try:
            payload = decode_token(refresh_token)
        except ValueError as e:
            raise InvalidSession(str(e))
        
        user_id = payload.get("sub")
        sid = payload.get("sid")
        if not user_id or not sid:
            raise InvalidSession("Invalid refresh token payload.")
            
        session_store = get_store(self.redis_client, StoreEnums.SESSION)
        session_json = await session_store.get(sid)
        if not session_json:
            raise InvalidSession("Session has expired or has been revoked.")
            
        session_data = json.loads(session_json)
        if session_data.get("refresh_token") != refresh_token:
            raise InvalidSession("Refresh token mismatch or already used.")
            
        user = await self.user_repository.get_user_by_id(user_id)
        if not user:
            raise UserNotFound("User not found.")
            
        # Rotate refresh token
        new_sid = uuid.uuid4().hex
        new_access_token = create_access_token(
            {"sub": user_id, "username": user.username, "sid": new_sid}
        )
        new_refresh_token = create_refresh_token({"sub": user_id, "sid": new_sid})
        
        # Remove old session
        await session_store.delete(sid)
        await session_store.remove_user_session(user_id, sid)
        
        # Save new session
        new_session_data = {
            "user_id": user_id,
            "username": user.username,
            "refresh_token": new_refresh_token,
            "ip_address": request_info.get("ip_address"),
            "user_agent": request_info.get("user_agent"),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await session_store.set(new_sid, json.dumps(new_session_data))
        await session_store.add_user_session(user_id, new_sid)
        
        return LoginResponseData(
            access_token=new_access_token,
            refresh_token=new_refresh_token,
            token_type="Bearer"
        )

    async def register(
        self, register_data: RegisterUserRequest
    ) -> RegisterUserResponseData:
    
        # Build registration strategy using builder
        strategy = (
            UserRegisterationBuilder()
            .set_request_data(register_data)
            .set_user_repository(self.user_repository)
            .set_kafka(self.kafka_producer)
            .set_redis(self.redis_client)
            .set_strategy_type(register_data.registeration_type)
            .build()
        )

        await UserRegisterationFactory.get_strategy(register_data.registeration_type, strategy).register()
        return RegisterUserResponseData()

    async def verify_email(self, user_id: str, code: str) -> None:
        
        # Retrieve user from DB
        user = await self.user_repository.get_user_by_id(user_id)
        if not user:
            raise UserNotFound()

        # If already verified (e.g. concurrent React StrictMode calls or reload), return successfully
        if user.is_email_verified:
            return

        # Check stored OTP in Redis
        redis_store = get_store(self.redis_client, StoreEnums.EMAIL_VERIFICATION)
        stored_otp = await redis_store.get(user_id)

        if not stored_otp or stored_otp != code:
            raise RepeatedPassword()

        # Update email verified flag
        user.is_email_verified = True
        await self.user_repository.session.commit()

        # Clean up Redis OTP key
        await redis_store.delete(user_id)

        # Publish email.verified event to Kafka
        

        event = (
            EmailVerifiedEventBuilder()
            .set_user_id(user.id)
            .set_username(user.username)
            .set_email(user.email)
            .build()
        )
        self.kafka_producer.publish(topic=KafakTopics.EMAIL_VERIFIED, message=asdict(event))

    async def check_phone_exists(self, phone: str) -> bool:
        user = await self.user_repository.get_user_by_phone(phone)
        return user is not None

    async def reset_password(self, reset_type: str, identifier: str, password: str) -> None:
        builder = (
            UserResetPasswordBuilder()
            .set_strategy_type(reset_type)
            .set_identifier(identifier)
            .set_password(password)
            .set_user_repository(self.user_repository)
            .set_kafka(self.kafka_producer)
            .build()
        )
        
        strategy = UserResetPasswordFactory.get_strategy(reset_type, builder)
        if not strategy:
            raise ValueError(f"Invalid reset strategy type: {reset_type}")
            
        await strategy.reset_password()

    async def request_password_reset(self, email: str) -> None:
        user = await self.user_repository.get_user_by_email(email)
        if not user:
            raise EmailNotFound()

        if not user.is_email_verified:
            raise AccountNotVerified("Account is not verified.")

        token = str(uuid4())

        redis_store = get_store(self.redis_client, StoreEnums.PASSWORD_RESET)
        await redis_store.set(str(user.id), token)

        event = (
            UserPasswordResetRequestedEventBuilder()
            .set_user_id(user.id)
            .set_username(user.username)
            .set_email(user.email)
            .set_token(token)
            .build()
        )
        self.kafka_producer.publish(topic=KafakTopics.USER_PASSWORD_RESET_REQUESTED, message=asdict(event))

    async def verify_password_reset_token(self, user_id: str, code: str) -> str:
        redis_store = get_store(self.redis_client, StoreEnums.PASSWORD_RESET)
        stored_token = await redis_store.get(user_id)

        if not stored_token or stored_token != code:
            raise InvalidVerificationCode("Invalid or expired password reset link.")

        user = await self.user_repository.get_user_by_id(user_id)
        if not user:
            raise UserNotFound("User not found.")
        return user.email

    async def get_user_info_by_username(self, username: str) -> User:
        user = await self.user_repository.get_user_by_username(username)
        if not user:
            raise UserNotFound("User not found.")
        return user

    async def resend_verification_email(self, email: str) -> None:
        user = await self.user_repository.get_user_by_email(email)
        if not user:
            raise UserNotFound("User not found.")
        if user.is_email_verified:
            raise EmailAlreadyExists("Email is already verified.")

        otp = generate_otp()
        redis_store = get_store(self.redis_client, StoreEnums.EMAIL_VERIFICATION)
        await redis_store.set(str(user.id), str(otp))

        event = (
            UserRegisteredEventBuilder()
            .set_email(user.email)
            .set_phone(user.phone)
            .set_registration_method("email")
            .set_user_id(user.id)
            .set_username(user.username)
            .set_otp(otp)
            .build()
        )
        self.kafka_producer.publish(topic=KafakTopics.USER_REGISTERED, message=asdict(event))

    async def search_user(self, identifier: str) -> UserSearchResponse:
        user = await self.user_repository.get_user(identifier)
        
        if not user:
            return UserSearchResponse(
                success=True,
                message="User not found",
                data=UserSearchResponseData()
            )

        return UserSearchResponse(
            success=True,
            message="User found",
            data=UserSearchResponseData(),
        )
