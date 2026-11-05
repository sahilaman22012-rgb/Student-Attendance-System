import os

from pydantic import EmailStr, TypeAdapter
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.core.security import get_password_hash
from app.db.session import SessionLocal
from app.models import User, UserRole, UserStatus


email_adapter = TypeAdapter(EmailStr)


def bootstrap_admin() -> None:
    email_value = os.getenv("BOOTSTRAP_ADMIN_EMAIL", "").strip()
    password = os.getenv("BOOTSTRAP_ADMIN_PASSWORD", "")
    if not email_value or not password:
        raise RuntimeError("Set BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD")
    email = email_adapter.validate_python(email_value).lower()
    if len(password) < 12 or len(password.encode("utf-8")) > 72:
        raise RuntimeError("Bootstrap password must be at least 12 and at most 72 UTF-8 bytes")

    with SessionLocal.begin() as db:
        if db.scalar(select(User.id).where(User.role == UserRole.ADMIN).limit(1)) is not None:
            raise RuntimeError("An administrator already exists; bootstrap will not modify existing accounts")
        admin = User(
            email=email,
            hashed_password=get_password_hash(password),
            first_name="System",
            last_name="Administrator",
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE,
        )
        db.add(admin)
        try:
            db.flush()
        except IntegrityError:
            raise RuntimeError("The bootstrap email is already in use") from None
        print(f"Created administrator account for {email}")


if __name__ == "__main__":
    bootstrap_admin()
