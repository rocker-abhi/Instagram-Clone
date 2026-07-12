from app.repository.user_reposiory import UserRepository
from app.models.user import User
from app.schemas.user_schema import UserSearchResponse, UserSearchResponseData
from app.exceptions.business_exception import UserNotFound


class UserService:

    def __init__(self, user_repository: UserRepository):
        self.user_repository = user_repository

    async def check_phone_exists(self, phone: str) -> bool:
        user = await self.user_repository.get_user_by_phone(phone)
        return user is not None

    async def get_user_info_by_username(self, username: str) -> User:
        user = await self.user_repository.get_user_by_username(username)
        if not user:
            raise UserNotFound("User not found.")
        return user

    async def search_user(self, identifier: str) -> UserSearchResponse:
        user = await self.user_repository.get_user(identifier)
        
        if not user:
            return UserSearchResponse(
                success=True,
                message="User not found",
                data=UserSearchResponseData()
            )

        return UserSearchResponse(
            success=True,
            message="User found",
            data=UserSearchResponseData(),
        )
