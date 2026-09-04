from datetime import datetime

from pydantic import BaseModel

from app.models.authenticator import AuthenticatorStatus


class AuthenticatorInviteCreate(BaseModel):
    email: str


class AuthenticatorRead(BaseModel):
    id: int
    concert_id: int
    concert_title: str
    venue: str
    event_date: datetime
    inviter_user_id: int
    invitee_user_id: int
    inviter_name: str
    invitee_name: str
    status: AuthenticatorStatus
    created_at: datetime
    accepted_at: datetime | None
