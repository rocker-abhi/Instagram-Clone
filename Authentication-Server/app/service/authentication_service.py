import hashlib
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions.business_exception import InvalidPassword, UserNotFound
from app.models.refresh_session import RefreshSession
from app.repository.user_reposiory import UserRepository
from app.schemas.login_schema import LoginRequest, LoginResponseData
from app.utils.jwt import create_access_token, create_refresh_token
from app.utils.password import verify_password


class AuthenticationService:

    def __init__(self, session: AsyncSession):
        self.session = session
        self.user_repository = UserRepository(session)

    async def login(
        self, login_data: LoginRequest, request_info: dict = None
    ) -> LoginResponseData:
        # Retrieve user from database
        user = await self.user_repository.get_user(
            login_data.login_type, login_data.identifier
        )
        if not user:
            raise UserNotFound("User not found.")

        # Verify password
        if not verify_password(login_data.password, user.password_hash):
            raise InvalidPassword("Invalid password.")

        # Generate tokens
        user_id_str = str(user.id)
        access_token = create_access_token(
            {"sub": user_id_str, "username": user.username}
        )
        refresh_token = create_refresh_token({"sub": user_id_str})

        # Hash refresh token for DB storage
        refresh_token_hash = hashlib.sha256(
            refresh_token.encode("utf-8")
        ).hexdigest()

        # Parse request info
        request_info = request_info or {}
        expires_at = datetime.now(timezone.utc) + timedelta(days=7)

        # Save refresh session to database
        session_record = RefreshSession(
            user_id=user.id,
            refresh_token_hash=refresh_token_hash,
            device_name=request_info.get("device_name"),
            device_type=request_info.get("device_type"),
            platform=request_info.get("platform"),
            browser=request_info.get("browser"),
            ip_address=request_info.get("ip_address"),
            user_agent=request_info.get("user_agent"),
            expires_at=expires_at,
        )

        self.session.add(session_record)
        await self.session.commit()

        return LoginResponseData(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="Bearer",
        )
