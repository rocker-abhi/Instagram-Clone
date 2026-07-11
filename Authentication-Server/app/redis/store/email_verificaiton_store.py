from app.redis.interface.redis_interface import RedisInterface
from app.core.config import settings
from app.exceptions.infrastructure_exception import InfrastructureException


class EmailVerificationStore(RedisInterface):

    def __init__(self, redis_client):
        self.redis_client = redis_client

    async def get(self, key: str) -> str | None:
        try:
            return await self.redis_client.get(f"email_verification:{key}")
        except Exception as e:
            raise InfrastructureException(service="Redis") from e

    async def set(self, key: str, value: str) -> None:
        try:
            expire = settings.EMAIL_VERIFICATION_TTL
            await self.redis_client.set(f"email_verification:{key}", value, ex=expire)
        except Exception as e:
            raise InfrastructureException(service="Redis") from e

    async def delete(self, key: str) -> None:
        try:
            await self.redis_client.delete(key)
        except Exception as e:
            raise InfrastructureException(service="Redis") from e