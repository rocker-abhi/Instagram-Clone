from fastapi import APIRouter, Depends

from app.routes.dependencies import get_user_service
from app.schemas.user_schema import (
    UserSearchRequest,
    UserSearchResponse,
    UserSearchResponseData,
)
from app.service.user_service import UserService

user_router = APIRouter(prefix="/users", tags=["users"])


@user_router.get("/search", response_model=UserSearchResponse)
async def search_user(
    params: UserSearchRequest = Depends(),
    user_service: UserService = Depends(get_user_service),
):
    response = await user_service.search_user(params.identifier)
    return response
