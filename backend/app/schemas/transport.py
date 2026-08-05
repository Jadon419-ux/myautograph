from datetime import datetime

from pydantic import BaseModel


class TransportCompanyCreate(BaseModel):
    name: str
    description: str = ""
    logo_url: str | None = None


class TransportCompanyUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    logo_url: str | None = None


class TransportCompanyRead(BaseModel):
    id: int
    owner_user_id: int
    name: str
    description: str
    logo_url: str | None
    bus_count: int
    created_at: datetime


class TransportBusCreate(BaseModel):
    name: str
    plate_number: str
    capacity: int
    description: str = ""


class TransportBusUpdate(BaseModel):
    name: str | None = None
    plate_number: str | None = None
    capacity: int | None = None
    description: str | None = None
    is_active: bool | None = None


class TransportBusRead(BaseModel):
    id: int
    company_id: int
    company_name: str
    name: str
    plate_number: str
    capacity: int
    description: str
    is_active: bool
    created_at: datetime
