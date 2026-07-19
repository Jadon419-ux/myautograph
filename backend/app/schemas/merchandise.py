from datetime import datetime

from pydantic import BaseModel

from app.models.merchandise import MerchandiseOrderStatus


class MerchandiseCreate(BaseModel):
    title: str
    description: str = ""
    image_url: str
    price_kobo: int
    quantity_total: int


class MerchandiseUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    image_url: str | None = None
    price_kobo: int | None = None
    quantity_total: int | None = None
    is_active: bool | None = None


class MerchandiseRead(BaseModel):
    id: int
    celebrity_id: int
    celebrity_stage_name: str
    title: str
    description: str
    image_url: str
    price_kobo: int
    quantity_total: int
    quantity_sold: int
    quantity_available: int
    is_active: bool
    created_at: datetime


class MerchandiseOrderCreate(BaseModel):
    quantity: int = 1


class MerchandiseOrderRead(BaseModel):
    id: int
    merchandise_id: int
    merchandise_title: str
    merchandise_image_url: str
    buyer_user_id: int
    quantity: int
    amount_kobo: int
    paystack_reference: str
    status: MerchandiseOrderStatus
    created_at: datetime
    paid_at: datetime | None
    authorization_url: str | None = None


class MerchandiseSaleRead(BaseModel):
    order_id: int
    merchandise_id: int
    merchandise_title: str
    buyer_name: str
    buyer_email: str
    quantity: int
    amount_kobo: int
    created_at: datetime
