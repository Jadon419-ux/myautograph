from datetime import datetime

from pydantic import BaseModel

from app.schemas.celebrity import CelebrityRead


class ConcertCreate(BaseModel):
    title: str
    venue: str
    event_date: datetime
    description: str = ""
    celebrity_id: int | None = None
    agent_commission_percent: float = 0.0
    flyer_url: str | None = None


class ConcertRead(BaseModel):
    id: int
    agent_id: int
    title: str
    venue: str
    event_date: datetime
    description: str
    agent_commission_percent: float
    flyer_url: str | None = None
    celebrities: list[CelebrityRead] = []
