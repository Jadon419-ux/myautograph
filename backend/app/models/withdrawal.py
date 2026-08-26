from datetime import datetime
from enum import Enum

from sqlmodel import SQLModel, Field


class WithdrawalStatus(str, Enum):
    pending = "pending"
    paid = "paid"
    failed = "failed"


class WithdrawalAccount(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", unique=True)
    bank_code: str
    bank_name: str
    account_number: str
    account_name: str
    recipient_code: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)


class WalletWithdrawal(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    withdrawal_account_id: int = Field(foreign_key="withdrawalaccount.id")
    amount_kobo: int
    paystack_reference: str = Field(unique=True, index=True)
    paystack_transfer_code: str = ""
    status: WithdrawalStatus = WithdrawalStatus.pending
    failure_reason: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)
    paid_at: datetime | None = None
