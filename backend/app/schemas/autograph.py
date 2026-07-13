from datetime import datetime

from pydantic import BaseModel

from app.models.autograph import AutographRequestStatus


class AutographRequestCreate(BaseModel):
    celebrity_id: int
    message: str = ""


class AutographRequestRead(BaseModel):
    id: int
    fan_id: int
    celebrity_id: int
    message: str
    status: AutographRequestStatus
    created_at: datetime


class AutographRequestUpdate(BaseModel):
    status: AutographRequestStatus


class AutographCreate(BaseModel):
    request_id: int | None = None
    content_url: str
    caption: str = ""


class AutographRead(BaseModel):
    id: int
    celebrity_id: int
    request_id: int | None
    content_url: str
    caption: str
    created_at: datetime
