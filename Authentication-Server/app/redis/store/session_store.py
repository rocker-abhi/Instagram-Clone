import json
from app.redis.interface.redis_interface import RedisInterface
from app.core.config import settings
from app.exceptions.infrastructure_exception import InfrastructureException


class SessionStore(RedisInterface):

    def __init__(self, redis_client):
        self.redis_client = redis_client

    async def get(self, key: str) -> str | None:
        try:
            return await self.redis_client.get(f"session:{key}")
        except Exception as e:
            raise InfrastructureException(service="Redis") from e

    async def set(
        self, key: str, value: str, expire: int | None = None
    ) -> None:
        try:
            if expire is None:
                # Default to 7 days if not configured otherwise
                expire = getattr(settings, "REFRESH_TOKEN_TTL", 604800)
            await self.redis_client.set(f"session:{key}", value, ex=expire)
        except Exception as e:
            raise InfrastructureException(service="Redis") from e

    async def delete(self, key: str) -> None:
        try:
            await self.redis_client.delete(f"session:{key}")
        except Exception as e:
            raise InfrastructureException(service="Redis") from e

    async def add_user_session(self, user_id: str, sid: str) -> None:
        try:
            await self.redis_client.sadd(f"user_sessions:{user_id}", sid)
            # Expire the set in 7 days to clean up
            await self.redis_client.expire(f"user_sessions:{user_id}", getattr(settings, "REFRESH_TOKEN_TTL", 604800))
        except Exception as e:
            raise InfrastructureException(service="Redis") from e

    async def remove_user_session(self, user_id: str, sid: str) -> None:
        try:
            await self.redis_client.srem(f"user_sessions:{user_id}", sid)
        except Exception as e:
            raise InfrastructureException(service="Redis") from e

    async def get_user_sessions(self, user_id: str) -> list[str]:
        try:
            return list(await self.redis_client.smembers(f"user_sessions:{user_id}"))
        except Exception as e:
            raise InfrastructureException(service="Redis") from e

    async def delete_all_user_sessions(self, user_id: str) -> None:
        try:
            key = f"user_sessions:{user_id}"
            sids = await self.redis_client.smembers(key)
            if sids:
                keys_to_delete = [f"session:{sid}" for sid in sids]
                # Also delete the session IDs from Redis
                for k in keys_to_delete:
                    await self.redis_client.delete(k)
                await self.redis_client.delete(key)
        except Exception as e:
            raise InfrastructureException(service="Redis") from e
