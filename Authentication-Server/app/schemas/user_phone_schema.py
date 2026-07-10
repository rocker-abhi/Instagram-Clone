from pydantic import BaseModel, Field


class UserPhoneRequest(BaseModel):
    phone: str = Field(..., description="The phone number to search for")


class UserPhoneResponse(BaseModel):
    success: bool
    exists: bool
    message: str
