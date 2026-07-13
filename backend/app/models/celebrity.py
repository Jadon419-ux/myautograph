from sqlmodel import SQLModel, Field


class CelebrityProfile(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", unique=True)
    stage_name: str
    bio: str = ""
    category: str = ""
    profile_image_url: str | None = None
