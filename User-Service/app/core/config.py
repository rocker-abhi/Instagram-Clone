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

    model_config = SettingsConfigDict(
        env_file=env_path,
        extra="ignore",
    )


settings = __Settings()
