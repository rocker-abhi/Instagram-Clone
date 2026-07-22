from minio import Minio

from app.core.config import settings
from app.storage.minio_storage import MinioStorage


class StorageFactory:

    _storage = None

    @classmethod
    def get_storage(cls) -> MinioStorage:

        if cls._storage is None:

            client = Minio(
                endpoint=settings.MINIO_ENDPOINT,
                access_key=settings.MINIO_ACCESS_KEY,
                secret_key=settings.MINIO_SECRET_KEY,
                secure=False,
                region="us-east-1",
            )

            # Create a separate client for generating URLs so signatures match the public domain (localhost:9000)
            url_client = Minio(
                endpoint=settings.MINIO_PUBLIC_URL.replace("http://", "").replace("https://", ""),
                access_key=settings.MINIO_ACCESS_KEY,
                secret_key=settings.MINIO_SECRET_KEY,
                secure=False,
                region="us-east-1",
            )

            client.presigned_get_object = url_client.presigned_get_object
            client.presigned_put_object = url_client.presigned_put_object
            client.get_presigned_url = url_client.get_presigned_url

            cls._storage = MinioStorage(client)

        return cls._storage