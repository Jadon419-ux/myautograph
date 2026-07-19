from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.celebrity import VerificationStatus


class CelebrityRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    stage_name: str
    bio: str
    category: str
    profile_image_url: str | None = None
    avatar_url: str | None = None
    verification_status: VerificationStatus
    rejection_reason: str


class CelebrityUpdate(BaseModel):
    bio: str | None = None
    category: str | None = None
    profile_image_url: str | None = None


class CelebrityModerationRead(CelebrityRead):
    owner_email: str
    owner_full_name: str
    created_at: datetime
