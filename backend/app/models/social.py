from datetime import datetime

from sqlmodel import SQLModel, Field


class Post(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    author_user_id: int = Field(foreign_key="user.id")
    celebrity_id: int | None = Field(default=None, foreign_key="celebrityprofile.id")
    content: str
    image_url: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Comment(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    post_id: int = Field(foreign_key="post.id")
    author_user_id: int = Field(foreign_key="user.id")
    content: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class PostLike(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    post_id: int = Field(foreign_key="post.id")
    user_id: int = Field(foreign_key="user.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)


class CelebrityFollow(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    follower_user_id: int = Field(foreign_key="user.id")
    celebrity_id: int = Field(foreign_key="celebrityprofile.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)


class FanFollow(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    follower_user_id: int = Field(foreign_key="user.id")
    followee_user_id: int = Field(foreign_key="user.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
