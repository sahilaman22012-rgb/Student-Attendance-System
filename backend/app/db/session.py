from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings


DATABASE_URL = settings.get_database_url() or "postgresql+psycopg://postgres:postgres@localhost:5432/secure_qr_attendance"


class Base(DeclarativeBase):
    """Base class for all ORM models."""


engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
