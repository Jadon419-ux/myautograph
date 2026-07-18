from datetime import datetime

from pydantic import BaseModel

from app.models.review import ReviewTargetType


class ReviewCreate(BaseModel):
    rating: int
    comment: str = ""


class ReviewRead(BaseModel):
    id: int
    author_user_id: int
    author_name: str
    author_avatar_url: str | None
    target_type: ReviewTargetType
    target_id: int
    rating: int
    comment: str
    created_at: datetime


class ReviewListRead(BaseModel):
    reviews: list[ReviewRead]
    average_rating: float
    review_count: int
