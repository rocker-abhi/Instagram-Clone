import uuid
import logging
from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import db
from app.utils.jwt import decode_token
from app.service.post_service import PostService
from app.service.story_service import StoryService
from app.exceptions.business_exception import (
    JWTException,
    InvalidTokenException,
    MissingTokenPayloadException,
    InvalidUserIdFormatException,
)

logger = logging.getLogger(__name__)


async def get_db() -> AsyncSession:
    """
    Dependency yielding an asynchronous database session.
    """
    async with db.session_factory() as session:
        yield session


async def get_current_user(request: Request) -> dict:
    """
    Dependency authenticating incoming request using Bearer RS256 JWT validation.
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
    Extract and validate the user UUID from decoded JWT claims.
    """
    user_id_str = current_user.get("sub") or current_user.get("user_id")
    if not user_id_str:
        raise MissingTokenPayloadException()

    try:
        return uuid.UUID(user_id_str)
    except ValueError:
        raise InvalidUserIdFormatException()


def get_current_user_id(current_user: dict = Depends(get_current_user)) -> uuid.UUID:
    """
    Convenient dependency returning authenticated user UUID directly.
    """
    return extract_user_uuid(current_user)


async def get_post_service(session: AsyncSession = Depends(get_db)) -> PostService:
    """
    Dependency injecting PostService instance bound to current session.
    """
    return PostService(session)


async def get_story_service(session: AsyncSession = Depends(get_db)) -> StoryService:
    """
    Dependency injecting StoryService instance bound to current session.
    """
    return StoryService(session)
