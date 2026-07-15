from datetime import datetime

from sqlmodel import SQLModel, Field


class TicketCategory(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    concert_id: int = Field(foreign_key="concert.id")
    name: str
    is_free: bool = False
    price_kobo: int = 0
    quantity_total: int
    quantity_sold: int = 0
    sales_start: datetime
    sales_end: datetime
    created_at: datetime = Field(default_factory=datetime.utcnow)
