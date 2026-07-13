from datetime import datetime

from pydantic import BaseModel

from app.schemas.celebrity import CelebrityRead


class ConcertCreate(BaseModel):
    title: str
    venue: str
    event_date: datetime
    description: str = ""


class ConcertRead(BaseModel):
    id: int
    agent_id: int
    title: str
    venue: str
    event_date: datetime
    description: str
    celebrities: list[CelebrityRead] = []
