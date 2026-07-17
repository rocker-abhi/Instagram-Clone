import uuid
import logging
from fastapi import HTTPException, Request, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import db
from app.utils.jwt import decode_token
from app.repository.conversation_repository import ConversationRepository
from app.service.conversation_service import ConversationService

logger = logging.getLogger(__name__)


async def get_db() -> AsyncSession:
    """
    Dependency to yield an asynchronous database session.
    """
    async with db.session_factory() as session:
        yield session


async def get_current_user_id(request: Request) -> uuid.UUID:
    """
    Dependency to validate JWT and return the user's UUID.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        raise HTTPException(status_code=401, detail="Authorization header is missing")

    parts = auth_header.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail="Authorization header must be Bearer token")

    token = parts[1]
    try:
        payload = decode_token(token)
        user_id_str = payload.get("sub") or payload.get("user_id")
        if not user_id_str:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        return uuid.UUID(user_id_str)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=401, detail="Authentication failed")


async def get_conversation_service(
    session: AsyncSession = Depends(get_db)
) -> ConversationService:
    """
    Dependency to provide ConversationService instances.
    """
    repo = ConversationRepository(session)
    return ConversationService(repo)
