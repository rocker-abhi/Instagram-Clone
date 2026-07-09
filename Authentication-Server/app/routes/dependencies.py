from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.dependency import get_db
from app.kafka.producer import KafkaProducer
from app.redis.factory.factory import get_store
from app.repository.user_reposiory import UserRepository
from app.service.authentication_service import AuthenticationService


from app.service.user_service import UserService


def get_user_repository(
    session: AsyncSession = Depends(get_db),
) -> UserRepository:
    return UserRepository(session)


def get_redis_store():
    return get_store


def get_kafka_producer() -> KafkaProducer:
    return KafkaProducer()


def get_auth_service(
    user_repository: UserRepository = Depends(get_user_repository),
    redis_store=Depends(get_redis_store),
    kafka_producer: KafkaProducer = Depends(get_kafka_producer),
) -> AuthenticationService:
    return AuthenticationService(
        user_repository=user_repository,
        redis_store=redis_store,
        kafka_producer=kafka_producer,
    )


def get_user_service(
    user_repository: UserRepository = Depends(get_user_repository),
) -> UserService:
    return UserService(user_repository)
