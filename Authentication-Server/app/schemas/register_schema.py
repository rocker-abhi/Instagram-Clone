import re
from typing import Literal
from pydantic import BaseModel, Field, model_validator, field_validator
from uuid import UUID


class RegisterUserRequest(BaseModel):
    registeration_type: Literal["email", "phone"] = Field(
        ..., description="Registration method: email or phone"
    )
    username: str = Field(
        ..., min_length=6, max_length=20, description="User username"
    )
    password: str = Field(..., min_length=6, description="User password")
    email: str | None = Field(None, description="User email address")
    phone: str | None = Field(None, description="User phone number")

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        if " " in v:
            raise ValueError("Username cannot contain spaces")
        if not re.match(r"^[a-zA-Z0-9._]+$", v):
            raise ValueError("Usernames can only use letters, numbers, underscores, and periods")
        if v.startswith(".") or v.endswith("."):
            raise ValueError("Usernames cannot start or end with a period")
        if ".." in v:
            raise ValueError("Usernames cannot contain consecutive periods")
        if len(v) < 6 or len(v) > 20:
            raise ValueError("Username must be between 6 and 20 characters")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if " " in v:
            raise ValueError("Password cannot contain spaces")
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters long")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        # Require at least one special character
        if not re.search(r"[^\w\s]", v):
            raise ValueError("Password must contain at least one special character")
        return v

    @model_validator(mode="after")
    def validate_method_fields(self) -> "RegisterUserRequest":
        if self.registeration_type == "email" and not self.email:
            raise ValueError("Email is required for email registration method")
        if self.registeration_type == "phone" and not self.phone:
            raise ValueError("Phone number is required for phone registration method")
        return self


class RegisterUserResponseData(BaseModel):
    id: UUID
    username: str
    email: str | None = None
    phone: str | None = None


class RegisterUserResponse(BaseModel):
    success: bool = True
    message: str = "User created"
    data: RegisterUserResponseData
