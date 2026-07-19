from datetime import datetime
from enum import Enum

from sqlmodel import SQLModel, Field


class VerificationStatus(str, Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class CelebrityProfile(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", unique=True)
    stage_name: str
    bio: str = ""
    category: str = ""
    profile_image_url: str | None = None
    verification_status: VerificationStatus = VerificationStatus.pending
    rejection_reason: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)
