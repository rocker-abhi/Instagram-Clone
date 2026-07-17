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

    model_config = SettingsConfigDict(
        env_file=env_path,
        extra="ignore",
    )

settings = __Settings()
