from datetime import datetime

from pydantic import BaseModel

from app.models.stream_order import StreamOrderStatus


class StreamCreate(BaseModel):
    title: str
    embed_url: str
    scheduled_at: datetime
    concert_id: int | None = None
    price_kobo: int = 0
    celebrity_id: int | None = None  # only used when a manager is creating the stream


class StreamRead(BaseModel):
    id: int
    celebrity_id: int
    concert_id: int | None
    title: str
    scheduled_at: datetime
    is_live: bool
    price_kobo: int
    has_access: bool
    embed_url: str | None = None  # only populated once the viewer has access


class StreamAccessOrderRead(BaseModel):
    id: int
    stream_id: int
    amount_kobo: int
    status: StreamOrderStatus
    authorization_url: str | None = None
