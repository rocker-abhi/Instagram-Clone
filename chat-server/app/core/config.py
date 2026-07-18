import os
from pydantic_settings import BaseSettings, SettingsConfigDict

env_path = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"
)


class __Settings(BaseSettings):
    APP_NAME: str
    SERVICE_NAME: str
    DEBUG: bool
    DATABASE_URL: str
    HOST: str
    PORT: int

    JWT_PUBLIC_KEY_PATH: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "shared", "keys", "jwt_public_key.pem"))

    # gRPC — User-Service
    USER_SERVICE_HOST_GRPC: str = "localhost"
    USER_SERVICE_PORT_GRPC: int = 50051

    # Redis Config
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    REDIS_PASSWORD: str = ""

    model_config = SettingsConfigDict(
        env_file=env_path,
        extra="ignore",
    )

settings = __Settings()

