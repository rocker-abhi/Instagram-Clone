import os
from pydantic_settings import BaseSettings, SettingsConfigDict

env_path = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"
)


class __Settings(BaseSettings):
    APP_NAME: str
    DEBUG: bool
    HOST: str
    PORT: int
    DATABASE_URL: str
    SERVICE_NAME: str
    JWT_PUBLIC_KEY_PATH: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "shared", "keys", "jwt_public_key.pem"))
    USER_SERVICE_HOST_GRPC: str
    USER_SERVICE_PORT_GRPC: int
    AUTH_SERVICE_HOST_GRPC: str
    AUTH_SERVICE_PORT_GRPC: int

    MINIO_ENDPOINT: str
    MINIO_ACCESS_KEY: str
    MINIO_SECRET_KEY: str
    MINIO_SECURE: bool = False
    MINIO_PUBLIC_URL: str = "http://localhost:9000"

    model_config = SettingsConfigDict(
        env_file=env_path,
        extra="ignore",
    )


settings = __Settings()
