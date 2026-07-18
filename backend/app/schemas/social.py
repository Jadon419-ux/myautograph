from datetime import datetime

from pydantic import BaseModel


class PostCreate(BaseModel):
    celebrity_id: int | None = None
    content: str
    image_url: str = ""


class PostRead(BaseModel):
    id: int
    author_user_id: int
    author_name: str
    author_avatar_url: str | None
    celebrity_id: int | None
    celebrity_stage_name: str | None
    content: str
    image_url: str
    created_at: datetime
    like_count: int
    comment_count: int
    liked_by_me: bool


class CommentCreate(BaseModel):
    content: str


class CommentRead(BaseModel):
    id: int
    post_id: int
    author_user_id: int
    author_name: str
    author_avatar_url: str | None
    content: str
    created_at: datetime


class LikeStatus(BaseModel):
    liked: bool
    like_count: int


class FollowStatus(BaseModel):
    following: bool
