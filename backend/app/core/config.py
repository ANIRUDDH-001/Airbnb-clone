from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration, read from environment variables (or backend/.env)."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./data/app.db"
    session_secret: str = "dev-only-change-me"
    cookie_secure: bool = False
    seed_on_startup: bool = False  # switched on in Task 13 once the seed exists


@lru_cache
def get_settings() -> Settings:
    return Settings()
