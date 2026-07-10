from fastapi import APIRouter, Depends

from app.routes.dependencies import get_user_service
from app.schemas.user_schema import (
    UserSearchRequest,
    UserSearchResponse,
)
from app.schemas.user_phone_schema import (
    UserPhoneRequest,
    UserPhoneResponse,
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


@user_router.get("/phone", response_model=UserPhoneResponse)
async def check_phone(
    params: UserPhoneRequest = Depends(),
    user_service: UserService = Depends(get_user_service),
):
    exists = await user_service.check_phone_exists(params.phone)
    if exists:
        return UserPhoneResponse(
            success=True, exists=True, message="Phone number already exists"
        )
    return UserPhoneResponse(
        success=True, exists=False, message="Phone number is available"
    )
