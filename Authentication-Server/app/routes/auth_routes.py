import logging
from fastapi import APIRouter, Depends, Request

from app.routes.dependencies import get_auth_service
from app.schemas.login_schema import LoginRequest, LoginResponse
from app.service.authentication_service import AuthenticationService
from app.schemas.register_schema import RegisterUserRequest, RegisterUserResponse
from app.schemas.reset_password_schema import ResetPasswordRequest, PasswordResetEmailRequest
from app.schemas.user_schema import UserSearchRequest, UserSearchResponse
from app.schemas.user_phone_schema import UserPhoneRequest, UserPhoneResponse

auth_router = APIRouter(prefix="/auth", tags=["auth"])
user_router = APIRouter(prefix="/users", tags=["users"])

logger = logging.getLogger(__name__)

@auth_router.post("/login", response_model=LoginResponse)
async def login(
    login_data: LoginRequest,
    request: Request,
    auth_service: AuthenticationService = Depends(get_auth_service),
):
    # Retrieve client request info
    user_agent = request.headers.get("user-agent", "")
    ip_address = request.client.host if request.client else None

    request_info = {
        "ip_address": ip_address,
        "user_agent": user_agent,
        "browser": user_agent.split(" ")[0] if user_agent else "Unknown",
    }
    
    logger.info("Request info", extra=request_info)

    response_data = await auth_service.login(login_data, request_info)

    return LoginResponse(success=True, data=response_data)

@auth_router.post("/register", response_model=RegisterUserResponse)
async def register_user(
    register_data: RegisterUserRequest,
    auth_service: AuthenticationService = Depends(get_auth_service),
):
    response_data = await auth_service.register(register_data)
    msg = "User created"
    if register_data.registeration_type == "email":
        msg = "an verification email is sent to you email"
    return RegisterUserResponse(
        success=True, message=msg, data=response_data
    )

@auth_router.get("/verify-email")
async def verify_email(
    user_id: str,
    code: str,
    auth_service: AuthenticationService = Depends(get_auth_service),
):
    await auth_service.verify_email(user_id, code)
    return {"success": True, "message": "Email verified successfully."}

@auth_router.get("/check-phone")
async def check_phone(
    phone: str,
    auth_service: AuthenticationService = Depends(get_auth_service),
):
    exists = await auth_service.check_phone_exists(phone)
    return {"success": True, "exists": exists}

@auth_router.post("/reset-password")
async def reset_password(
    data: ResetPasswordRequest,
    auth_service: AuthenticationService = Depends(get_auth_service),
):
    identifier = data.phone if data.reset_type == "phone" else data.email
    await auth_service.reset_password(data.reset_type, identifier, data.password)
    return {"success": True, "message": "Password reset successfully."}

@auth_router.post("/request-password-reset")
async def request_password_reset(
    email_data: PasswordResetEmailRequest,
    auth_service: AuthenticationService = Depends(get_auth_service),
):
    await auth_service.request_password_reset(email_data.email)
    return {"success": True, "message": "Password reset link sent to your email."}

@auth_router.get("/verify-reset-password")
async def verify_reset_password(
    user_id: str,
    code: str,
    auth_service: AuthenticationService = Depends(get_auth_service),
):
    email = await auth_service.verify_password_reset_token(user_id, code)
    return {"success": True, "email": email, "message": "Password reset token is valid."}

@auth_router.get("/user-info")
async def get_user_info(
    username: str,
    auth_service: AuthenticationService = Depends(get_auth_service),
):
    user_info = await auth_service.get_user_info_by_username(username)
    return {
        "success": True, 
        "email": user_info.email, 
        "phone": user_info.phone,
        "is_email_verified": user_info.is_email_verified
    }

@auth_router.post("/resend-verification-email")
async def resend_verification_email(
    email_data: PasswordResetEmailRequest,
    auth_service: AuthenticationService = Depends(get_auth_service),
):
    await auth_service.resend_verification_email(email_data.email)
    return {"success": True, "message": "Verification link sent successfully."}

@user_router.get("/search", response_model=UserSearchResponse)
async def search_user(
    params: UserSearchRequest = Depends(),
    auth_service: AuthenticationService = Depends(get_auth_service),
):
    response = await auth_service.search_user(params.identifier)
    return response

@user_router.get("/phone", response_model=UserPhoneResponse)
async def check_phone(
    params: UserPhoneRequest = Depends(),
    auth_service: AuthenticationService = Depends(get_auth_service),
):
    exists = await auth_service.check_phone_exists(params.phone)
    if exists:
        return UserPhoneResponse(
            success=True, exists=True, message="Phone number already exists"
        )
    return UserPhoneResponse(
        success=True, exists=False, message="Phone number is available"
    )