from datetime import datetime
from enum import Enum

from sqlmodel import SQLModel, Field


class MerchandiseOrderStatus(str, Enum):
    pending = "pending"
    paid = "paid"
    failed = "failed"


class CelebrityMerchandise(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    celebrity_id: int = Field(foreign_key="celebrityprofile.id")
    title: str
    description: str = ""
    image_url: str
    price_kobo: int
    quantity_total: int
    quantity_reserved: int = 0
    quantity_sold: int = 0
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)


class MerchandiseOrder(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    merchandise_id: int = Field(foreign_key="celebritymerchandise.id")
    buyer_user_id: int = Field(foreign_key="user.id")
    quantity: int
    amount_kobo: int
    paystack_reference: str = Field(unique=True, index=True)
    status: MerchandiseOrderStatus = MerchandiseOrderStatus.pending
    created_at: datetime = Field(default_factory=datetime.utcnow)
    paid_at: datetime | None = None
