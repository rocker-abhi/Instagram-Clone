from typing import Literal
from pydantic import BaseModel, Field
from uuid import UUID


class UserSearchRequest(BaseModel):
    identifier: str = Field(
        ..., description="The user identifier to search for"
    )

class UserSearchResponseData(BaseModel):
    pass

class UserSearchResponse(BaseModel):
    success: bool
    message: str
    data: UserSearchResponseData
