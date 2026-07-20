import logging
from minio import Minio

from app.core.config import settings
from app.storage.minio_storage import MinioStorage

logger = logging.getLogger(__name__)


class StorageFactory:
    """
    Factory class providing singleton access to the MinIO Storage client instance.
    """

    _storage: MinioStorage | None = None

    @classmethod
    def get_storage(cls) -> MinioStorage:
        if cls._storage is None:
            logger.info("Initializing MinIO storage client for endpoint: %s", settings.MINIO_ENDPOINT)
            client = Minio(
                endpoint=settings.MINIO_ENDPOINT,
                access_key=settings.MINIO_ACCESS_KEY,
                secret_key=settings.MINIO_SECRET_KEY,
                secure=settings.MINIO_SECURE,
            )
            cls._storage = MinioStorage(client)

        return cls._storage


# Convenient module-level instance for direct imports across Post-Server
minio_storage = StorageFactory.get_storage()
