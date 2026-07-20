from typing import Generic, TypeVar, Optional
from pydantic import BaseModel

T = TypeVar("T")


class APIResponse(BaseModel, Generic[T]):
    """
    Standardized API Response wrapper.
    """
    success: bool = True
    message: str = "Operation completed successfully."
    data: Optional[T] = None
