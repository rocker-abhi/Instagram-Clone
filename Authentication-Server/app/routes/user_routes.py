import logging
from fastapi import APIRouter, Depends

from app.routes.dependencies import get_user_service
from app.service.user_service import UserService
from app.schemas.user_schema import UserSearchRequest, UserSearchResponse
from app.schemas.user_phone_schema import UserPhoneRequest, UserPhoneResponse

user_router = APIRouter(prefix="/users", tags=["users"])
logger = logging.getLogger(__name__)


@user_router.get("/search", response_model=UserSearchResponse)
async def search_user(
    params: UserSearchRequest = Depends(),
    user_service: UserService = Depends(get_user_service),
):
    response = await user_service.search_user(params.identifier)
    return response


@user_router.get("/phone", response_model=UserPhoneResponse)
async def check_phone_exists_param(
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


@user_router.get("/check-phone")
async def check_phone(
    phone: str,
    user_service: UserService = Depends(get_user_service),
):
    exists = await user_service.check_phone_exists(phone)
    return {"success": True, "exists": exists}


@user_router.get("/user-info")
async def get_user_info(
    username: str,
    user_service: UserService = Depends(get_user_service),
):
    user_info = await user_service.get_user_info_by_username(username)
    return {
        "success": True, 
        "email": user_info.email, 
        "phone": user_info.phone,
        "is_email_verified": user_info.is_email_verified
    }
