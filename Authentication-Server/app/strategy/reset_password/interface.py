from abc import ABC, abstractmethod


class UserResetPasswordInterface(ABC):

    @abstractmethod
    async def reset_password(self) -> dict:
        pass