import asyncio
from datetime import timedelta
from minio import Minio
from minio.error import S3Error

# pyrefly: ignore [missing-import]
from app.storage.base.multi_part_form_data_base import Storage

# pyrefly: ignore [missing-import]
from app.storage.models import (
    DeleteRequest,
    UploadRequest,
    UploadResult,
)


class MinioStorage(Storage):

    def __init__(self, client: Minio):
        self._client = client

    async def upload(
        self,
        request: UploadRequest,
    ) -> UploadResult:
        """
        Upload a file to MinIO asynchronously.
        """
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
        Delete a file from MinIO asynchronously.
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
        Uses asyncio.to_thread because the MinIO SDK's presigned_get_object
        is a blocking call.

        Args:
            bucket:     MinIO bucket name.
            object_key: Object key (path) inside the bucket.
            expires_in: URL lifetime in seconds (max 7 days = 604800).

        Returns:
            A fully-qualified pre-signed URL the browser can fetch directly.
        """
        url = await asyncio.to_thread(
            self._client.presigned_get_object,
            bucket_name=bucket,
            object_name=object_key,
            expires=timedelta(seconds=expires_in),
        )
        return url