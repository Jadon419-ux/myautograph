from datetime import datetime

from pydantic import BaseModel


class StreamCreate(BaseModel):
    title: str
    embed_url: str
    scheduled_at: datetime


class StreamRead(BaseModel):
    id: int
    celebrity_id: int
    title: str
    embed_url: str
    scheduled_at: datetime
    is_live: bool
