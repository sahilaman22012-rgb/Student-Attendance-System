from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models.user import UserRole


class TokenPayload(BaseModel):
    sub: UUID
    type: str
    role: UserRole | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def password_fits_bcrypt(cls, value: str) -> str:
        if len(value.encode("utf-8")) > 72:
            raise ValueError("Password must be at most 72 UTF-8 bytes")
        return value


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)

    @field_validator("current_password", "new_password")
    @classmethod
    def password_fits_bcrypt(cls, value: str) -> str:
        if len(value.encode("utf-8")) > 72:
            raise ValueError("Password must be at most 72 UTF-8 bytes")
        return value


class UserTokenInfo(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: EmailStr
    role: UserRole
    first_name: str
    last_name: str


class Token(BaseModel):
    access_token: str
    refresh_token: str | None = None
    token_type: str = "bearer"
    user: UserTokenInfo | None = None
