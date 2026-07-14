from abc import ABC, abstractmethod

# pyrefly: ignore [missing-import]
from app.storage.models import (
    DeleteRequest,
    UploadRequest,
    UploadResult
)


class Storage(ABC):
    """
    Base class for all storage providers.
    """

    @abstractmethod
    async def upload(
        self,
        request: UploadRequest,
    ) -> UploadResult:
        """
        Upload a file.
        """
        pass

    @abstractmethod
    async def delete(
        self,
        request: DeleteRequest,
    ) -> None:
        """
        Delete a file.
        """
        pass

    @abstractmethod
    async def exists(
        self,
        bucket: str,
        object_key: str,
    ) -> bool:
        """
        Check whether a file exists.
        """
        pass

    @abstractmethod
    async def get_url(
        self,
        bucket: str,
        object_key: str,
    ) -> str:
        """
        Generate a download URL.
        """
        pass