import pytest
from pydantic import ValidationError

from app.core.config import Settings
from app.schemas.auth import ChangePasswordRequest, LoginRequest
from app.schemas.user import StudentCreate


def test_production_requires_postgresql_and_https_origins() -> None:
    with pytest.raises(ValidationError, match="PostgreSQL"):
        Settings(
            _env_file=None,
            ENVIRONMENT="production",
            SECRET_KEY="a" * 40,
            DATABASE_URL="sqlite:///attendance.db",
            CORS_ORIGINS=["https://attendance.example.edu"],
        )

    with pytest.raises(ValidationError, match="SECRET_KEY"):
        Settings(
            _env_file=None,
            ENVIRONMENT="production",
            SECRET_KEY="replace-with-a-long-random-secret-key",
            DATABASE_URL="postgresql+psycopg://user:password@localhost/attendance",
            CORS_ORIGINS=["https://attendance.example.edu"],
        )

    with pytest.raises(ValidationError, match="HTTPS"):
        Settings(
            _env_file=None,
            ENVIRONMENT="production",
            SECRET_KEY="a" * 40,
            DATABASE_URL="postgresql+psycopg://user:password@localhost/attendance",
            CORS_ORIGINS=["http://attendance.example.edu"],
        )


def test_production_accepts_valid_settings() -> None:
    settings = Settings(
        _env_file=None,
        ENVIRONMENT="production",
        SECRET_KEY="a" * 40,
        DATABASE_URL="postgresql+psycopg://user:password@localhost/attendance",
        CORS_ORIGINS=["https://attendance.example.edu"],
    )
    assert settings.ENVIRONMENT == "production"


def test_production_builds_database_url_with_special_password_characters() -> None:
    settings = Settings(
        _env_file=None,
        ENVIRONMENT="production",
        SECRET_KEY="a" * 40,
        DATABASE_HOST="db",
        DATABASE_USER="attendiq",
        DATABASE_PASSWORD="a@b/c:d",
        DATABASE_NAME="attendiq",
        CORS_ORIGINS=["https://attendance.example.edu"],
    )
    assert settings.get_database_url() == (
        "postgresql+psycopg://attendiq:a%40b%2Fc%3Ad@db:5432/attendiq"
    )


@pytest.mark.parametrize(
    ("database_url", "expected_url"),
    [
        (
            "postgresql://user:password@db.example.test:5432/attendance",
            "postgresql+psycopg://user:password@db.example.test:5432/attendance",
        ),
        (
            "postgres://user:password@db.example.test:5432/attendance",
            "postgresql+psycopg://user:password@db.example.test:5432/attendance",
        ),
    ],
)
def test_postgres_provider_urls_use_installed_psycopg_driver(
    database_url: str,
    expected_url: str,
) -> None:
    settings = Settings(
        _env_file=None,
        ENVIRONMENT="production",
        SECRET_KEY="a" * 40,
        DATABASE_URL=database_url,
        CORS_ORIGINS=["https://attendance.example.edu"],
    )
    assert settings.get_database_url() == expected_url


def test_cors_origins_accept_comma_separated_environment_value(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("CORS_ORIGINS", "http://localhost:5173, http://127.0.0.1:5173")
    settings = Settings(_env_file=None)
    assert settings.CORS_ORIGINS == ["http://localhost:5173", "http://127.0.0.1:5173"]


def test_password_inputs_reject_values_over_bcrypt_byte_limit() -> None:
    with pytest.raises(ValidationError, match="72 UTF-8 bytes"):
        LoginRequest(email="student@example.edu", password="é" * 37)

    with pytest.raises(ValidationError, match="72 UTF-8 bytes"):
        ChangePasswordRequest(current_password="old-password", new_password="é" * 37)

    with pytest.raises(ValidationError, match="72 UTF-8 bytes"):
        ChangePasswordRequest(current_password="é" * 37, new_password="new-password")

    with pytest.raises(ValidationError, match="72 UTF-8 bytes"):
        StudentCreate(
            email="student@example.edu",
            password="é" * 37,
            first_name="Sam",
            last_name="Student",
            roll_number="S-1",
            batch_year=2026,
            department="Computing",
        )
