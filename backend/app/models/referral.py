from datetime import datetime
from enum import Enum

from sqlmodel import SQLModel, Field

from app.models.user import RoleEnum


class ReferralLinkStatus(str, Enum):
    pending = "pending"
    accepted = "accepted"
    declined = "declined"


class ReferralLink(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    concert_id: int = Field(foreign_key="concert.id")
    code: str = Field(unique=True, index=True)
    inviter_user_id: int = Field(foreign_key="user.id")
    invitee_role: RoleEnum
    invitee_user_id: int | None = Field(default=None, foreign_key="user.id")
    parent_referral_link_id: int | None = Field(default=None, foreign_key="referrallink.id")
    commission_percent: float
    status: ReferralLinkStatus = ReferralLinkStatus.pending
    created_at: datetime = Field(default_factory=datetime.utcnow)
    accepted_at: datetime | None = None
