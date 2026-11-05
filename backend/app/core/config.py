from functools import lru_cache
from typing import Annotated

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict
from sqlalchemy.engine import URL


class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    PROJECT_NAME: str = "Secure Dynamic QR Attendance System"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "change-this-secret-key-in-production"
    ALGORITHM: str = "HS256"
    DATABASE_URL: str | None = None
    DATABASE_HOST: str | None = None
    DATABASE_PORT: int = Field(default=5432, gt=0, le=65535)
    DATABASE_USER: str | None = None
    DATABASE_PASSWORD: str | None = None
    DATABASE_NAME: str | None = None
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=15, gt=0)
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(default=7, gt=0)
    CORS_ORIGINS: Annotated[list[str], NoDecode] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")

    @field_validator("ENVIRONMENT")
    @classmethod
    def normalize_environment(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in {"development", "test", "production"}:
            raise ValueError("ENVIRONMENT must be development, test, or production")
        return normalized

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @model_validator(mode="after")
    def validate_production_settings(self) -> "Settings":
        if self.ALGORITHM != "HS256":
            raise ValueError("Only HS256 is supported for JWT signing")
        if self.ENVIRONMENT == "production":
            if (
                len(self.SECRET_KEY) < 32
                or self.SECRET_KEY == "change-this-secret-key-in-production"
                or self.SECRET_KEY.startswith("replace-with-")
            ):
                raise ValueError("Production requires a randomly generated SECRET_KEY of at least 32 characters")
            database_url = self.get_database_url()
            if not database_url:
                raise ValueError("Production requires DATABASE_URL")
            if not database_url.startswith(("postgresql://", "postgresql+psycopg://")):
                raise ValueError("Production requires a PostgreSQL DATABASE_URL")
            if not self.CORS_ORIGINS or any(
                "*" in origin or not origin.startswith("https://")
                for origin in self.CORS_ORIGINS
            ):
                raise ValueError("Production requires explicit HTTPS CORS_ORIGINS")
        return self

    def get_database_url(self) -> str | None:
        if self.DATABASE_URL:
            if self.DATABASE_URL.startswith("postgres://"):
                return "postgresql+psycopg://" + self.DATABASE_URL[len("postgres://"):]
            if self.DATABASE_URL.startswith("postgresql://"):
                return "postgresql+psycopg://" + self.DATABASE_URL[len("postgresql://"):]
            return self.DATABASE_URL
        if all(
            (
                self.DATABASE_HOST,
                self.DATABASE_USER,
                self.DATABASE_PASSWORD is not None,
                self.DATABASE_NAME,
            )
        ):
            return URL.create(
                "postgresql+psycopg",
                username=self.DATABASE_USER,
                password=self.DATABASE_PASSWORD,
                host=self.DATABASE_HOST,
                port=self.DATABASE_PORT,
                database=self.DATABASE_NAME,
            ).render_as_string(hide_password=False)
        return None


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
