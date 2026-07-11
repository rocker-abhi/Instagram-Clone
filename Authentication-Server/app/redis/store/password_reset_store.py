from app.redis.interface.redis_interface import RedisInterface
from app.exceptions.infrastructure_exception import InfrastructureException


class PasswordResetStore(RedisInterface):

    def __init__(self, redis_client):
        self.redis_client = redis_client

    async def get(self, key: str) -> str | None:
        try:
            return await self.redis_client.get(f"password_reset:{key}")
        except Exception as e:
            raise InfrastructureException(service="Redis") from e

    async def set(self, key: str, value: str) -> None:
        try:
            # 30 minutes expiration
            expire = 1800
            await self.redis_client.set(f"password_reset:{key}", value, ex=expire)
        except Exception as e:
            raise InfrastructureException(service="Redis") from e

    async def delete(self, key: str) -> None:
        try:
            await self.redis_client.delete(f"password_reset:{key}")
        except Exception as e:
            raise InfrastructureException(service="Redis") from e
