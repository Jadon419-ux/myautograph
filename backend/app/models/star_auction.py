from datetime import datetime
from enum import Enum

from sqlmodel import SQLModel, Field


class StarAuctionStatus(str, Enum):
    active = "active"
    sold = "sold"
    unsold = "unsold"
    cancelled = "cancelled"


class StarAuction(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    celebrity_id: int = Field(foreign_key="celebrityprofile.id")
    title: str
    description: str = ""
    image_url: str
    starting_price_kobo: int
    ends_at: datetime
    status: StarAuctionStatus = StarAuctionStatus.active
    winning_bid_id: int | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    settled_at: datetime | None = None


class StarAuctionBid(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    auction_id: int = Field(foreign_key="starauction.id")
    bidder_user_id: int = Field(foreign_key="user.id")
    amount_kobo: int
    created_at: datetime = Field(default_factory=datetime.utcnow)
