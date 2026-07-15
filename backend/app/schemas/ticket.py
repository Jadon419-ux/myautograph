from datetime import datetime

from pydantic import BaseModel

from app.models.referral import ReferralLinkStatus
from app.models.ticket import TicketStatus
from app.models.ticket_order import TicketOrderStatus
from app.models.user import RoleEnum


class TicketCategoryCreate(BaseModel):
    name: str
    is_free: bool = False
    price_kobo: int = 0
    quantity_total: int
    sales_start: datetime
    sales_end: datetime


class TicketCategoryUpdate(BaseModel):
    name: str | None = None
    is_free: bool | None = None
    price_kobo: int | None = None
    quantity_total: int | None = None
    sales_start: datetime | None = None
    sales_end: datetime | None = None


class TicketCategoryRead(BaseModel):
    id: int
    concert_id: int
    name: str
    is_free: bool
    price_kobo: int
    quantity_total: int
    quantity_sold: int
    sales_start: datetime
    sales_end: datetime


class ReferralInviteCreate(BaseModel):
    celebrity_id: int
    commission_percent: float


class SalesAgentInviteCreate(BaseModel):
    commission_percent: float


class ReferralLinkRead(BaseModel):
    id: int
    concert_id: int
    code: str
    inviter_user_id: int
    invitee_role: RoleEnum
    invitee_user_id: int | None
    parent_referral_link_id: int | None
    commission_percent: float
    status: ReferralLinkStatus
    created_at: datetime
    accepted_at: datetime | None


class TicketOrderCreate(BaseModel):
    category_id: int
    quantity: int = 1
    recipient_name: str = ""
    recipient_email: str = ""
    referral_code: str | None = None


class TicketOrderRead(BaseModel):
    id: int
    concert_id: int
    ticket_category_id: int
    quantity: int
    paystack_reference: str
    amount_kobo: int
    status: TicketOrderStatus
    created_at: datetime
    paid_at: datetime | None
    authorization_url: str | None = None


class TicketRead(BaseModel):
    id: int
    ticket_category_id: int
    concert_id: int
    order_id: int
    recipient_name: str
    recipient_email: str
    referral_link_id: int | None
    qr_token: str
    status: TicketStatus
    checked_in_at: datetime | None
    created_at: datetime


class SellerBreakdown(BaseModel):
    referral_link_id: int | None
    seller_label: str
    tickets_sold: int
    revenue_kobo: int
    commission_kobo: int


class ConcertAnalyticsRead(BaseModel):
    concert_id: int
    total_tickets_sold: int
    total_revenue_kobo: int
    breakdown: list[SellerBreakdown]
