from abc import ABC, abstractmethod


class UserRegisterationInterface(ABC):

    @abstractmethod
    async def register(self) -> dict:
        pass