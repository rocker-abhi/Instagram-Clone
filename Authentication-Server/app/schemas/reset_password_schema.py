import re
from typing import Literal
from pydantic import BaseModel, Field, model_validator, field_validator


class ResetPasswordRequest(BaseModel):
    reset_type: Literal["email", "phone"] = Field(..., description="Reset method: email or phone")
    email: str | None = Field(None, description="User email address")
    phone: str | None = Field(None, description="User phone number")
    password: str = Field(..., min_length=6, description="New password")
    confirm_password: str = Field(..., min_length=6, description="Confirm new password")

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
        if not re.search(r"[^\w\s]", v):
            raise ValueError("Password must contain at least one special character")
        return v

    @model_validator(mode="after")
    def validate_reset_fields(self) -> "ResetPasswordRequest":
        if self.reset_type == "email" and not self.email:
            raise ValueError("Email is required for email reset method")
        if self.reset_type == "phone" and not self.phone:
            raise ValueError("Phone number is required for phone reset method")
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match")
        return self


class PasswordResetEmailRequest(BaseModel):
    email: str = Field(..., description="User email address")


class ChangePasswordRequest(BaseModel):
    password: str = Field(..., min_length=6, description="New password")
    confirm_password: str = Field(..., min_length=6, description="Confirm new password")

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
        if not re.search(r"[^\w\s]", v):
            raise ValueError("Password must contain at least one special character")
        return v

    @model_validator(mode="after")
    def validate_passwords_match(self) -> "ChangePasswordRequest":
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match")
        return self

