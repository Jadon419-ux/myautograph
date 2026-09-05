from datetime import datetime
from enum import Enum

from sqlmodel import SQLModel, Field


class StreamOrderStatus(str, Enum):
    pending = "pending"
    paid = "paid"
    failed = "failed"


class StreamAccessOrder(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    stream_id: int = Field(foreign_key="stream.id")
    buyer_user_id: int = Field(foreign_key="user.id")
    amount_kobo: int
    paystack_reference: str = Field(unique=True, index=True)
    status: StreamOrderStatus = StreamOrderStatus.pending
    created_at: datetime = Field(default_factory=datetime.utcnow)
    paid_at: datetime | None = None
