from datetime import datetime
from enum import Enum

from sqlmodel import SQLModel, Field


class AutographRequestStatus(str, Enum):
    pending = "pending"
    fulfilled = "fulfilled"
    declined = "declined"


class AutographRequest(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    fan_id: int = Field(foreign_key="user.id")
    celebrity_id: int = Field(foreign_key="celebrityprofile.id")
    message: str = ""
    status: AutographRequestStatus = AutographRequestStatus.pending
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Autograph(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    celebrity_id: int = Field(foreign_key="celebrityprofile.id")
    request_id: int | None = Field(default=None, foreign_key="autographrequest.id")
    content_url: str
    caption: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)
