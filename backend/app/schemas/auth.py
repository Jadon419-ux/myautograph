from datetime import datetime

from pydantic import BaseModel

from app.models.user import RoleEnum


class UserCreate(BaseModel):
    email: str
    password: str
    full_name: str
    role: RoleEnum
    stage_name: str | None = None
    category: str | None = None
    referral_code: str | None = None


class UserRead(BaseModel):
    id: int
    email: str
    full_name: str
    role: RoleEnum
    avatar_url: str | None = None
    created_at: datetime


class AvatarUpdate(BaseModel):
    avatar_url: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
