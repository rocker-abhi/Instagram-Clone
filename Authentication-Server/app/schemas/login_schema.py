from typing import Literal
from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    login_type: Literal["username", "email", "phone"] = Field(
        ..., description="Type of login identifier used"
    )
    identifier: str = Field(
        ..., description="The username, email address, or phone number of the user"
    )
    password: str = Field(..., min_length=6, description="User password")


class LoginResponseData(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "Bearer"


class LoginResponse(BaseModel):
    success: bool = True
    message: str = "Login successful"
    data: LoginResponseData
