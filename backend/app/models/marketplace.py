from datetime import datetime
from enum import Enum

from sqlmodel import SQLModel, Field


class ListingType(str, Enum):
    fixed_price = "fixed_price"
    auction = "auction"


class ListingStatus(str, Enum):
    active = "active"
    pending_sale = "pending_sale"
    sold = "sold"
    cancelled = "cancelled"


class MarketplaceListing(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    autograph_id: int = Field(foreign_key="autograph.id")
    seller_user_id: int = Field(foreign_key="user.id")
    listing_type: ListingType
    price_kobo: int
    status: ListingStatus = ListingStatus.active
    auction_ends_at: datetime | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    sold_at: datetime | None = None


class Bid(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    listing_id: int = Field(foreign_key="marketplacelisting.id")
    bidder_user_id: int = Field(foreign_key="user.id")
    amount_kobo: int
    created_at: datetime = Field(default_factory=datetime.utcnow)


class MarketplaceOrderStatus(str, Enum):
    pending = "pending"
    paid = "paid"
    failed = "failed"


class MarketplaceOrder(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    listing_id: int = Field(foreign_key="marketplacelisting.id")
    buyer_user_id: int = Field(foreign_key="user.id")
    amount_kobo: int
    paystack_reference: str = Field(unique=True, index=True)
    status: MarketplaceOrderStatus = MarketplaceOrderStatus.pending
    created_at: datetime = Field(default_factory=datetime.utcnow)
    paid_at: datetime | None = None
