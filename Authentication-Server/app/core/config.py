import os
from pydantic import ValidationError
from pydantic_settings import BaseSettings, SettingsConfigDict

env_path = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"
)


class __Settings(BaseSettings):
    APP_NAME: str
    SERVICE_NAME: str
    DEBUG: bool

    DATABASE_URL: str
    REDIS_URL: str

    REDIS_HOST: str
    REDIS_PORT: int
    REDIS_DB: int
    REDIS_PASSWORD: str
    REFRESH_TOKEN_TTL: int
    EMAIL_VERIFICATION_TTL: int

    JWT_SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int

    HOST: str
    PORT: int

    # Kafka Config
    KAFKA_BOOTSTRAP_SERVERS: str
    KAFKA_BATCH_SIZE: int
    KAFKA_LINGER_MS: int
    KAFKA_ACKS: str
    KAFKA_RETRIES: int
    KAFKA_SECURITY_PROTOCOL: str
    KAFKA_SASL_MECHANISM: str
    KAFKA_SASL_PLAIN_USERNAME: str
    KAFKA_SASL_PLAIN_PASSWORD: str

    USER_SERVICE_HOST_GRPC: str
    USER_SERVICE_PORT_GRPC: int
    AUTH_SERVICE_HOST_GRPC: str
    AUTH_SERVICE_PORT_GRPC: int

    model_config = SettingsConfigDict(
        env_file=env_path,
        extra="ignore",
    )

settings = __Settings()