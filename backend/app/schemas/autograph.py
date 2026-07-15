from datetime import datetime

from pydantic import BaseModel

from app.models.autograph import AutographMedium, AutographRequestStatus


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


class PhysicalAutographCreate(BaseModel):
    recipient_name: str
    recipient_email: str = ""
    content_url: str
    caption: str = ""
    is_publicly_visible: bool = True


class AutographTransferCreate(BaseModel):
    to_email: str
    note: str = ""


class AutographRead(BaseModel):
    id: int
    celebrity_id: int
    request_id: int | None
    content_url: str
    caption: str
    medium: AutographMedium
    recipient_name: str
    owner_user_id: int | None
    verification_code: str
    is_publicly_visible: bool
    issued_at: datetime
    created_at: datetime


class AutographVerificationRead(BaseModel):
    verification_code: str
    celebrity_stage_name: str
    medium: AutographMedium
    content_url: str
    caption: str
    issued_at: datetime
    is_authenticated: bool = True
    owner_name: str | None = None
    recipient_name: str | None = None
    transfer_count: int
