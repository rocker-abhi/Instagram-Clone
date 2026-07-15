import logging
from fastapi import APIRouter, Depends, Request

from app.routes.dependencies import get_auth_service, get_current_user
from app.schemas.login_schema import LoginRequest, LoginResponse, RefreshRequest
from app.service.authentication_service import AuthenticationService
from app.schemas.register_schema import RegisterUserRequest, RegisterUserResponse
from app.schemas.reset_password_schema import ResetPasswordRequest, PasswordResetEmailRequest, ChangePasswordRequest

auth_router = APIRouter(prefix="/auth", tags=["auth"])

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


@auth_router.post("/reset-password")
async def reset_password(
    data: ResetPasswordRequest,
    auth_service: AuthenticationService = Depends(get_auth_service),
):
    identifier = data.phone if data.reset_type == "phone" else data.email
    await auth_service.reset_password(data.reset_type, identifier, data.password)
    return {"success": True, "message": "Password reset successfully."}


@auth_router.post("/change-password")
async def change_password(
    data: ChangePasswordRequest,
    current_user: dict = Depends(get_current_user),
    auth_service: AuthenticationService = Depends(get_auth_service),
):
    user_id = current_user.get("sub")
    await auth_service.change_password(user_id, data.password)
    return {"success": True, "message": "Password changed successfully."}

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


@auth_router.post("/resend-verification-email")
async def resend_verification_email(
    email_data: PasswordResetEmailRequest,
    auth_service: AuthenticationService = Depends(get_auth_service),
):
    await auth_service.resend_verification_email(email_data.email)
    return {"success": True, "message": "Verification link sent successfully."}

@auth_router.post("/logout")
async def logout(
    current_user: dict = Depends(get_current_user),
    auth_service: AuthenticationService = Depends(get_auth_service),
):
    sid = current_user.get("sid")
    await auth_service.logout(sid)
    return {"success": True, "message": "Logged out successfully."}

@auth_router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {"success": True, "user": current_user}


@auth_router.post("/refresh", response_model=LoginResponse)
async def refresh_token(
    refresh_data: RefreshRequest,
    request: Request,
    auth_service: AuthenticationService = Depends(get_auth_service),
):
    user_agent = request.headers.get("user-agent", "")
    ip_address = request.client.host if request.client else None
    request_info = {
        "ip_address": ip_address,
        "user_agent": user_agent,
        "browser": user_agent.split(" ")[0] if user_agent else "Unknown",
    }
    response_data = await auth_service.refresh_session(
        refresh_data.refresh_token, request_info
    )
    return LoginResponse(success=True, message="Token refreshed successfully", data=response_data)
