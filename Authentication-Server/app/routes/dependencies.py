from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.dependency import get_db
from app.kafka.producer import KafkaProducer
from app.repository.user_reposiory import UserRepository
from app.service.authentication_service import AuthenticationService
from app.service.user_service import UserService

from app.core.redis import redis_client


def get_user_repository(
    session: AsyncSession = Depends(get_db),
) -> UserRepository:
    return UserRepository(session)


def get_redis_client():
    return redis_client.get_redis_client()


def get_kafka_producer() -> KafkaProducer:
    return KafkaProducer()


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


def get_user_service(
    user_repository: UserRepository = Depends(get_user_repository),
) -> UserService:
    return UserService(user_repository)
