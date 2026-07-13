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


class UserRead(BaseModel):
    id: int
    email: str
    full_name: str
    role: RoleEnum
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
