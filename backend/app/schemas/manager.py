from pydantic import BaseModel

from app.schemas.celebrity import CelebrityRead


class CelebrityOnboardCreate(BaseModel):
    email: str
    password: str
    full_name: str
    stage_name: str
    category: str = ""


class RosterEntryRead(BaseModel):
    celebrity: CelebrityRead
