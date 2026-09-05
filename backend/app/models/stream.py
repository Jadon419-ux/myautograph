from datetime import datetime

from sqlmodel import SQLModel, Field


class Stream(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    celebrity_id: int = Field(foreign_key="celebrityprofile.id")
    concert_id: int | None = Field(default=None, foreign_key="concert.id")
    title: str
    embed_url: str
    scheduled_at: datetime
    is_live: bool = False
    price_kobo: int = 0
