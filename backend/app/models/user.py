from datetime import datetime
from enum import Enum

from sqlmodel import SQLModel, Field


class RoleEnum(str, Enum):
    fan = "fan"
    celebrity = "celebrity"
    agent = "agent"
    manager = "manager"
    admin = "admin"


class User(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    hashed_password: str
    full_name: str
    role: RoleEnum
    created_at: datetime = Field(default_factory=datetime.utcnow)
