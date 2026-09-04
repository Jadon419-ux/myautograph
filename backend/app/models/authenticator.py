from datetime import datetime
from enum import Enum

from sqlmodel import SQLModel, Field


class AuthenticatorStatus(str, Enum):
    pending = "pending"
    accepted = "accepted"
    declined = "declined"


class EventAuthenticator(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    concert_id: int = Field(foreign_key="concert.id")
    inviter_user_id: int = Field(foreign_key="user.id")
    invitee_user_id: int = Field(foreign_key="user.id")
    status: AuthenticatorStatus = AuthenticatorStatus.pending
    created_at: datetime = Field(default_factory=datetime.utcnow)
    accepted_at: datetime | None = None
