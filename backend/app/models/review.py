from datetime import datetime
from enum import Enum

from sqlmodel import SQLModel, Field


class ReviewTargetType(str, Enum):
    celebrity = "celebrity"
    concert = "concert"
    marketplace_listing = "marketplace_listing"


class Review(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    author_user_id: int = Field(foreign_key="user.id")
    target_type: ReviewTargetType
    target_id: int
    rating: int
    comment: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)
