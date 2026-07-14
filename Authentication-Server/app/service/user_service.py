from app.repository.user_reposiory import UserRepository
from app.models.user import User
from app.exceptions.business_exception import UserNotFound


class UserService:

    def __init__(self, user_repository: UserRepository):
        self.user_repository = user_repository

    async def check_phone_exists(self, phone: str) -> bool:
        user = await self.user_repository.get_user_by_phone(phone)
        return user is not None

    async def get_user_info_by_username(self, username: str) -> User:
        user_id = await self.user_repository.get_user_id_by_username(username)
        if not user_id:
            raise UserNotFound("User not found.")
        user = await self.user_repository.get_user_by_id(user_id)
        if not user:
            raise UserNotFound("User not found.")
        return user
