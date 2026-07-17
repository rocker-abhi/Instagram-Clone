from typing import Generic, Optional, TypeVar
from pydantic import BaseModel

T = TypeVar("T")


class APIResponse(BaseModel, Generic[T]):
    """
    Standard envelope wrapping every API response.
    """
    success: bool
    message: str
    data: Optional[T] = None
