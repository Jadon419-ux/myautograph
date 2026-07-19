from datetime import datetime

from pydantic import BaseModel

from app.models.user import RoleEnum


class RejectCelebrityRequest(BaseModel):
    reason: str = ""


class AdminUserRead(BaseModel):
    id: int
    email: str
    full_name: str
    role: RoleEnum
    created_at: datetime


class AddAdminRequest(BaseModel):
    email: str


class ConcertRevenueBreakdown(BaseModel):
    concert_id: int
    title: str
    tickets_sold: int
    revenue_kobo: int


class CelebrityMerchRevenueBreakdown(BaseModel):
    celebrity_id: int
    stage_name: str
    items_sold: int
    revenue_kobo: int


class AdminAnalyticsRead(BaseModel):
    total_ticket_revenue_kobo: int
    total_ticket_orders: int
    total_marketplace_revenue_kobo: int
    total_marketplace_orders: int
    concert_breakdown: list[ConcertRevenueBreakdown]
    marketplace_breakdown: list[CelebrityMerchRevenueBreakdown]
