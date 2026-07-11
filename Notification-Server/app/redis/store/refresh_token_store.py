import logging
from app.redis.interface.redis_interface import RedisInterface
from app.core.config import settings

logger = logging.getLogger(__name__)


class RefreshTokenStore(RedisInterface):

    def __init__(self, redis_client):
        self.redis_client = redis_client

    async def get(self, key: str) -> str | None:
        try:
            return await self.redis_client.get("refresh_token:{key}")
        except Exception as e:
            logger.error("Redis get error for key %s: %s", key, str(e))
            raise e

    async def set(
        self, key: str, value: str, expire: int | None = None
    ) -> None:
        try:
            if expire is None:
                expire = settings.REFRESH_TOKEN_TTL
            await self.redis_client.set(f"refresh_token:{key}", value, ex=expire)
        except Exception as e:
            logger.error("Redis set error for key %s: %s", key, str(e))
            raise e

    async def delete(self, key: str) -> None:
        try:
            await self.redis_client.delete(key)
        except Exception as e:
            logger.error("Redis delete error for key %s: %s", key, str(e))
            raise e