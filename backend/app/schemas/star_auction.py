from datetime import datetime

from pydantic import BaseModel

from app.models.star_auction import StarAuctionStatus


class StarAuctionCreate(BaseModel):
    title: str
    description: str = ""
    image_url: str
    starting_price_kobo: int
    duration_hours: int = 24


class StarAuctionRead(BaseModel):
    id: int
    celebrity_id: int
    celebrity_stage_name: str
    title: str
    description: str
    image_url: str
    starting_price_kobo: int
    current_highest_bid_kobo: int | None = None
    bid_count: int = 0
    ends_at: datetime
    status: StarAuctionStatus
    winning_bid_id: int | None
    created_at: datetime
    settled_at: datetime | None


class StarAuctionBidCreate(BaseModel):
    amount_kobo: int


class StarAuctionBidRead(BaseModel):
    id: int
    auction_id: int
    bidder_user_id: int
    bidder_name: str
    amount_kobo: int
    created_at: datetime
