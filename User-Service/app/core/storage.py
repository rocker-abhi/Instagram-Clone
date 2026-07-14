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
            )

            cls._storage = MinioStorage(client)

        return cls._storage