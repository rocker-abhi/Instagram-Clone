import logging
from app.redis.interface import RedisInterface
from app.exceptions.infrastructure_exception import InfrastructureException

logger = logging.getLogger(__name__)


class UserActiveStore(RedisInterface):
    """
    Store interface to track and retrieve active (online) users in Redis.
    Uses the key pattern "user:active:{user_id}".
    """

    def __init__(self, redis_client):
        self.redis_client = redis_client

    async def get(self, key: str) -> str | None:
        try:
            return await self.redis_client.get(f"user:active:{key}")
        except Exception as e:
            logger.error("Redis error fetching active status for key %s: %s", key, str(e))
            raise InfrastructureException(service="Redis") from e

    async def set(
        self, key: str, value: str, expire: int | None = None
    ) -> None:
        try:
            await self.redis_client.set(f"user:active:{key}", value, ex=expire)
        except Exception as e:
            logger.error("Redis error setting active status for key %s: %s", key, str(e))
            raise InfrastructureException(service="Redis") from e

    async def delete(self, key: str) -> None:
        try:
            await self.redis_client.delete(f"user:active:{key}")
        except Exception as e:
            logger.error("Redis error deleting active status for key %s: %s", key, str(e))
            raise InfrastructureException(service="Redis") from e

    # Domain specific helpers for active presence tracking
    async def set_active(self, user_id: str, expire_seconds: int = 60) -> None:
        """
        Mark a user as active with a sliding expiration (heartbeat).
        """
        await self.set(user_id, "online", expire=expire_seconds)

    async def set_inactive(self, user_id: str) -> None:
        """
        Mark a user as inactive immediately by deleting their key.
        """
        await self.delete(user_id)

    async def is_active(self, user_id: str) -> bool:
        """
        Check if a user is currently active (online).
        """
        val = await self.get(user_id)
        return val == "online"
