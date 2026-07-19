from datetime import datetime

from pydantic import BaseModel

from app.models.wallet import WalletFundingStatus, WalletTransactionType


class FundWalletRequest(BaseModel):
    amount_kobo: int


class WalletFundingOrderRead(BaseModel):
    id: int
    user_id: int
    amount_kobo: int
    paystack_reference: str
    status: WalletFundingStatus
    created_at: datetime
    paid_at: datetime | None
    authorization_url: str | None = None


class WalletTransactionRead(BaseModel):
    id: int
    type: WalletTransactionType
    amount_kobo: int
    description: str
    created_at: datetime


class WalletRead(BaseModel):
    balance_kobo: int
