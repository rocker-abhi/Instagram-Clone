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
    USER_SERVICE_GATEWAY_URL: str = os.getenv("USER_SERVICE_GATEWAY_URL", "http://nginx/user-profile")

    # Kafka Config
    KAFKA_BOOTSTRAP_SERVERS: str
    KAFKA_BATCH_SIZE: int = 32768
    KAFKA_LINGER_MS: int = 10
    KAFKA_ACKS: str = "all"
    KAFKA_RETRIES: int = 5
    KAFKA_SECURITY_PROTOCOL: str = "SASL_PLAINTEXT"
    KAFKA_SASL_MECHANISM: str = "PLAIN"
    KAFKA_SASL_PLAIN_USERNAME: str
    KAFKA_SASL_PLAIN_PASSWORD: str

    model_config = SettingsConfigDict(
        env_file=env_path,
        extra="ignore",
    )


settings = __Settings()
