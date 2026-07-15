from datetime import datetime
from enum import Enum

from sqlmodel import SQLModel, Field


class TicketOrderStatus(str, Enum):
    pending = "pending"
    paid = "paid"
    failed = "failed"


class TicketOrder(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    buyer_user_id: int = Field(foreign_key="user.id")
    concert_id: int = Field(foreign_key="concert.id")
    ticket_category_id: int = Field(foreign_key="ticketcategory.id")
    quantity: int
    paystack_reference: str = Field(unique=True, index=True)
    amount_kobo: int
    status: TicketOrderStatus = TicketOrderStatus.pending
    created_at: datetime = Field(default_factory=datetime.utcnow)
    paid_at: datetime | None = None
