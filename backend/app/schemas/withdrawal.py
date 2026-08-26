from datetime import datetime

from pydantic import BaseModel

from app.models.withdrawal import WithdrawalStatus


class BankRead(BaseModel):
    name: str
    code: str


class WithdrawalAccountCreate(BaseModel):
    bank_code: str
    account_number: str


class WithdrawalAccountRead(BaseModel):
    id: int
    bank_code: str
    bank_name: str
    account_number: str
    account_name: str
    created_at: datetime


class WithdrawalCreate(BaseModel):
    amount_kobo: int


class WithdrawalRead(BaseModel):
    id: int
    amount_kobo: int
    status: WithdrawalStatus
    failure_reason: str
    created_at: datetime
    paid_at: datetime | None
