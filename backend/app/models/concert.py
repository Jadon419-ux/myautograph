from datetime import datetime

from sqlmodel import SQLModel, Field


class Concert(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    agent_id: int = Field(foreign_key="user.id")
    title: str
    venue: str
    event_date: datetime
    description: str = ""
    agent_commission_percent: float = 0.0
    flyer_url: str | None = None


class ConcertCelebrityLink(SQLModel, table=True):
    concert_id: int = Field(foreign_key="concert.id", primary_key=True)
    celebrity_id: int = Field(foreign_key="celebrityprofile.id", primary_key=True)
