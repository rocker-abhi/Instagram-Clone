import uuid
import logging
from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import db
from app.utils.jwt import decode_token
from app.service.user_profile_service import UserProfileService
from app.exceptions.business_exception import (
    JWTException,
    InvalidTokenException,
    MissingTokenPayloadException,
    InvalidUserIdFormatException,
)

logger = logging.getLogger(__name__)


async def get_db() -> AsyncSession:
    """
    Dependency to yield an asynchronous database session.
    """
    async with db.session_factory() as session:
        yield session


async def get_current_user(request: Request) -> dict:
    """
    Dependency to authenticate requests using RS256 JWT validation.

    Raises:
        JWTException: Authorization header is missing.
        InvalidTokenException: Authorization header is malformed.
        JWTException: Token is expired or signature invalid (raised by decode_token).
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        raise JWTException("Authorization header is missing", status_code=401, error_code="MISSING_TOKEN")

    parts = auth_header.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise InvalidTokenException("Authorization header must be Bearer token")

    token = parts[1]
    payload = decode_token(token)
    return payload


def extract_user_uuid(current_user: dict) -> uuid.UUID:
    """
    Extract and validate the user UUID from the decoded JWT payload.
    Intended to be used as a FastAPI dependency or called directly from routes.

    Raises:
        MissingTokenPayloadException: if 'sub' / 'user_id' claim is absent.
        InvalidUserIdFormatException: if the claim value is not a valid UUID.
    """
    user_id_str = current_user.get("sub") or current_user.get("user_id")
    if not user_id_str:
        raise MissingTokenPayloadException()

    try:
        return uuid.UUID(user_id_str)
    except ValueError:
        raise InvalidUserIdFormatException()


async def get_user_profile_service(session: AsyncSession = Depends(get_db)) -> UserProfileService:
    """
    Dependency to provide UserProfileService instance.
    """
    return UserProfileService(session)
