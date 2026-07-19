from datetime import datetime
from enum import Enum

from sqlmodel import SQLModel, Field


class WalletFundingStatus(str, Enum):
    pending = "pending"
    paid = "paid"
    failed = "failed"


class WalletFundingOrder(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    amount_kobo: int
    paystack_reference: str = Field(unique=True, index=True)
    status: WalletFundingStatus = WalletFundingStatus.pending
    created_at: datetime = Field(default_factory=datetime.utcnow)
    paid_at: datetime | None = None


class WalletTransactionType(str, Enum):
    funding = "funding"


class WalletTransaction(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    type: WalletTransactionType
    amount_kobo: int
    description: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)
