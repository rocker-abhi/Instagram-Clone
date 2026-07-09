from app.repository.user_reposiory import UserRepository
from app.exceptions.business_exception import UserNotFound
from app.schemas.user_schema import UserSearchResponse, UserSearchResponseData


class UserService:

    def __init__(self, user_repository: UserRepository):
        self.user_repository = user_repository

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
