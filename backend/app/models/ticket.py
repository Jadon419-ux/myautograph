from datetime import datetime
from enum import Enum

from sqlmodel import SQLModel, Field


class TicketStatus(str, Enum):
    pending_payment = "pending_payment"
    valid = "valid"
    checked_in = "checked_in"
    cancelled = "cancelled"


class Ticket(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    ticket_category_id: int = Field(foreign_key="ticketcategory.id")
    concert_id: int = Field(foreign_key="concert.id")
    order_id: int = Field(foreign_key="ticketorder.id")
    buyer_user_id: int = Field(foreign_key="user.id")
    recipient_name: str = ""
    recipient_email: str = ""
    referral_link_id: int | None = Field(default=None, foreign_key="referrallink.id")
    qr_token: str = Field(unique=True, index=True)
    status: TicketStatus = TicketStatus.pending_payment
    checked_in_at: datetime | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
