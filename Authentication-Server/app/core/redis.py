import redis.asyncio as redis
from app.core.config import settings

class __RedisClient:

    __instance = None

    def __new__(cls):
        if cls.__instance is None :
            cls.__instance = super().__new__(cls)
        return cls.__instance
    
    def __init__(self):
        self.client = redis.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            db=settings.REDIS_DB,
            password=settings.REDIS_PASSWORD,
            decode_responses=True
        )
    
    async def ping(self):
        await self.client.ping()

    async def close(self):
        await self.client.close()

redis_client = __RedisClient()