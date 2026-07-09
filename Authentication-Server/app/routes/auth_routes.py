from fastapi import APIRouter, Depends, Request

from app.routes.dependencies import get_auth_service
from app.schemas.login_schema import LoginRequest, LoginResponse
from app.service.authentication_service import AuthenticationService

auth_router = APIRouter(prefix="/auth", tags=["auth"])


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
        # Parse basic browser name from User-Agent
        "browser": user_agent.split(" ")[0] if user_agent else "Unknown",
    }

    response_data = await auth_service.login(login_data, request_info)

    return LoginResponse(success=True, data=response_data)
