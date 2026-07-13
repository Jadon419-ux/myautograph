from pydantic import BaseModel, ConfigDict


class CelebrityRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    stage_name: str
    bio: str
    category: str
    profile_image_url: str | None = None


class CelebrityUpdate(BaseModel):
    bio: str | None = None
    category: str | None = None
    profile_image_url: str | None = None
