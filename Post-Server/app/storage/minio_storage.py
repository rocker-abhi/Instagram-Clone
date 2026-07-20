import asyncio
import logging
from datetime import timedelta
from minio import Minio
from minio.error import S3Error

from app.storage.models import (
    DeleteRequest,
    UploadRequest,
    UploadResult,
)

logger = logging.getLogger(__name__)


class MinioStorage:
    """
    MinIO Object Storage service implementation handling asynchronous
    file uploads, object deletions, existence checks, presigned URL generation,
    and bucket initialization.
    """

    def __init__(self, client: Minio):
        self._client = client

    async def ensure_bucket(self, bucket_name: str) -> None:
        """
        Check if bucket exists asynchronously, and create it if missing.
        """
        exists = await asyncio.to_thread(
            self._client.bucket_exists,
            bucket_name,
        )
        if not exists:
            await asyncio.to_thread(
                self._client.make_bucket,
                bucket_name,
            )
            logger.info("Created missing MinIO bucket: %s", bucket_name)

    async def upload(
        self,
        request: UploadRequest,
    ) -> UploadResult:
        """
        Upload a file payload to MinIO asynchronously.
        """
        # Ensure target bucket exists before uploading
        await self.ensure_bucket(request.bucket)

        response = await asyncio.to_thread(
            self._client.put_object,
            bucket_name=request.bucket,
            object_name=request.object_key,
            data=request.file,
            length=request.size,
            content_type=request.content_type,
        )

        return UploadResult(
            bucket=request.bucket,
            object_key=request.object_key,
            etag=response.etag,
        )

    async def delete(
        self,
        request: DeleteRequest,
    ) -> None:
        """
        Delete an object from MinIO asynchronously.
        """
        await asyncio.to_thread(
            self._client.remove_object,
            bucket_name=request.bucket,
            object_name=request.object_key,
        )

    async def exists(
        self,
        bucket: str,
        object_key: str,
    ) -> bool:
        """
        Check if an object exists asynchronously.
        """
        try:
            await asyncio.to_thread(
                self._client.stat_object,
                bucket_name=bucket,
                object_name=object_key,
            )
            return True
        except S3Error:
            return False

    async def get_url(
        self,
        bucket: str,
        object_key: str,
        expires_in: int = 3600,
    ) -> str:
        """
        Generate a pre-signed GET URL for the given object.
        The URL is valid for `expires_in` seconds (default: 1 hour).
        """
        url = await asyncio.to_thread(
            self._client.presigned_get_object,
            bucket_name=bucket,
            object_name=object_key,
            expires=timedelta(seconds=expires_in),
        )
        return url
