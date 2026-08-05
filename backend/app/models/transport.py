from datetime import datetime

from sqlmodel import SQLModel, Field


class TransportCompany(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    owner_user_id: int = Field(foreign_key="user.id", unique=True)
    name: str
    description: str = ""
    logo_url: str | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class TransportBus(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    company_id: int = Field(foreign_key="transportcompany.id")
    name: str
    plate_number: str
    capacity: int
    description: str = ""
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
