from functools import lru_cache

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration, read from environment variables (or backend/.env)."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./data/app.db"
    session_secret: str = "dev-only-change-me"
    cookie_secure: bool = False
    seed_on_startup: bool = True

    @model_validator(mode="after")
    def check_secure_session(self) -> "Settings":
        if self.cookie_secure and self.session_secret == "dev-only-change-me":
            raise ValueError("Refusing to boot: COOKIE_SECURE is true but SESSION_SECRET is still the default. Set a strong SESSION_SECRET.")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
