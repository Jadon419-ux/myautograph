from datetime import datetime

from pydantic import BaseModel

from app.models.marketplace import ListingStatus, ListingType, MarketplaceOrderStatus


class ListingCreate(BaseModel):
    autograph_id: int
    listing_type: ListingType
    price_kobo: int
    auction_duration_hours: int | None = None


class ListingRead(BaseModel):
    id: int
    autograph_id: int
    seller_user_id: int
    listing_type: ListingType
    price_kobo: int
    status: ListingStatus
    auction_ends_at: datetime | None
    created_at: datetime
    sold_at: datetime | None
    celebrity_stage_name: str
    content_url: str
    caption: str
    current_highest_bid_kobo: int | None = None
    bid_count: int = 0


class BidCreate(BaseModel):
    amount_kobo: int


class BidRead(BaseModel):
    id: int
    listing_id: int
    bidder_user_id: int
    bidder_name: str
    amount_kobo: int
    created_at: datetime


class MarketplaceOrderRead(BaseModel):
    id: int
    listing_id: int
    buyer_user_id: int
    amount_kobo: int
    paystack_reference: str
    status: MarketplaceOrderStatus
    created_at: datetime
    paid_at: datetime | None
    authorization_url: str | None = None
