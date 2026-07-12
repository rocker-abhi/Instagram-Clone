from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.dependency import get_db
from app.kafka.producer import KafkaProducer
from app.repository.user_reposiory import UserRepository
from app.service.authentication_service import AuthenticationService

from app.core.redis import redis_client


def get_user_repository(
    session: AsyncSession = Depends(get_db),
) -> UserRepository:
    return UserRepository(session)


async def get_redis_client():
    return await redis_client.get_redis_client()


def get_kafka_producer() -> KafkaProducer:
    return KafkaProducer()


from app.service.user_service import UserService


def get_user_service(
    user_repository: UserRepository = Depends(get_user_repository),
) -> UserService:
    return UserService(user_repository=user_repository)


def get_auth_service(
    user_repository: UserRepository = Depends(get_user_repository),
    redis_client=Depends(get_redis_client),
    kafka_producer: KafkaProducer = Depends(get_kafka_producer),
) -> AuthenticationService:
    return AuthenticationService(
        user_repository=user_repository,
        redis_client=redis_client,
        kafka_producer=kafka_producer,
    )



from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import HTTPException, status
from app.utils.jwt import decode_token
from app.redis.factory.factory import get_store
from app.redis.enum.store_enum import StoreEnums

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    redis_client = Depends(get_redis_client),
) -> dict:
    token = credentials.credentials
    try:
        payload = decode_token(token)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get("sub")
    sid = payload.get("sid")
    if not user_id or not sid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    session_store = get_store(redis_client, StoreEnums.SESSION)
    session_json = await session_store.get(sid)
    if not session_json:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired or has been revoked.",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    return payload


