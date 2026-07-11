from abc import ABC, abstractmethod


class RedisInterface(ABC):

    @abstractmethod
    def __init__(self, redis_client):
        pass

    @abstractmethod
    async def get(self, key: str) -> str | None:
        pass

    @abstractmethod
    async def set(
        self, key: str, value: str, expire: int | None = None
    ) -> None:
        pass

    @abstractmethod
    async def delete(self, key: str) -> None:
        pass