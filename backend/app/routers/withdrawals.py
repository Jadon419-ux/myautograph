import uuid
from datetime import datetime

import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.database import get_session
from app.deps import require_role
from app.models.user import RoleEnum, User
from app.models.wallet import WalletTransaction, WalletTransactionType
from app.models.withdrawal import WalletWithdrawal, WithdrawalAccount, WithdrawalStatus
from app.schemas.withdrawal import (
    BankRead,
    WithdrawalAccountCreate,
    WithdrawalAccountRead,
    WithdrawalCreate,
    WithdrawalRead,
)
from app.services.paystack import (
    create_transfer_recipient,
    initiate_transfer,
    list_banks,
    resolve_account_number,
)
from app.services.withdrawal import names_correlate

router = APIRouter(prefix="/withdrawals", tags=["withdrawals"])

WITHDRAWAL_ROLES = (RoleEnum.agent, RoleEnum.manager)
MIN_WITHDRAWAL_KOBO = 100000


def _reverse_withdrawal(session: Session, user: User, withdrawal: WalletWithdrawal, reason: str) -> None:
    user.wallet_balance_kobo += withdrawal.amount_kobo
    session.add(user)
    withdrawal.status = WithdrawalStatus.failed
    withdrawal.failure_reason = reason
    session.add(withdrawal)


@router.get("/banks", response_model=list[BankRead])
def get_banks(user: User = Depends(require_role(*WITHDRAWAL_ROLES))):
    banks = list_banks()
    return [BankRead(name=b["name"], code=b["code"]) for b in banks]


@router.get("/account", response_model=WithdrawalAccountRead | None)
def get_my_withdrawal_account(
    session: Session = Depends(get_session),
    user: User = Depends(require_role(*WITHDRAWAL_ROLES)),
):
    return session.exec(
        select(WithdrawalAccount).where(WithdrawalAccount.user_id == user.id)
    ).first()


@router.post("/account", response_model=WithdrawalAccountRead)
def set_withdrawal_account(
    payload: WithdrawalAccountCreate,
    session: Session = Depends(get_session),
    user: User = Depends(require_role(*WITHDRAWAL_ROLES)),
):
    banks = {b["code"]: b["name"] for b in list_banks()}
    bank_name = banks.get(payload.bank_code)
    if not bank_name:
        raise HTTPException(status_code=400, detail="Unknown bank")

    resolved = resolve_account_number(payload.account_number, payload.bank_code)
    account_name = resolved.get("account_name", "")

    if not names_correlate(user.full_name, account_name):
        raise HTTPException(
            status_code=400,
            detail=(
                f'This account is registered as "{account_name}", which does not match your '
                f"My Autograph account name ({user.full_name}). Withdrawals can only go to an "
                "account in your own name."
            ),
        )

    recipient = create_transfer_recipient(account_name, payload.account_number, payload.bank_code)

    account = session.exec(
        select(WithdrawalAccount).where(WithdrawalAccount.user_id == user.id)
    ).first()
    if account:
        account.bank_code = payload.bank_code
        account.bank_name = bank_name
        account.account_number = payload.account_number
        account.account_name = account_name
        account.recipient_code = recipient.get("recipient_code", "")
    else:
        account = WithdrawalAccount(
            user_id=user.id,
            bank_code=payload.bank_code,
            bank_name=bank_name,
            account_number=payload.account_number,
            account_name=account_name,
            recipient_code=recipient.get("recipient_code", ""),
        )

    session.add(account)
    session.commit()
    session.refresh(account)
    return account


@router.post("", response_model=WithdrawalRead)
def request_withdrawal(
    payload: WithdrawalCreate,
    session: Session = Depends(get_session),
    user: User = Depends(require_role(*WITHDRAWAL_ROLES)),
):
    if payload.amount_kobo < MIN_WITHDRAWAL_KOBO:
        raise HTTPException(status_code=400, detail="Minimum withdrawal amount is ₦1,000")

    available_kobo = user.wallet_balance_kobo - user.wallet_held_kobo
    if payload.amount_kobo > available_kobo:
        raise HTTPException(status_code=400, detail="Amount exceeds your available wallet balance")

    account = session.exec(
        select(WithdrawalAccount).where(WithdrawalAccount.user_id == user.id)
    ).first()
    if not account:
        raise HTTPException(status_code=400, detail="Add a verified withdrawal account first")

    user.wallet_balance_kobo -= payload.amount_kobo
    session.add(user)

    reference = uuid.uuid4().hex
    withdrawal = WalletWithdrawal(
        user_id=user.id,
        withdrawal_account_id=account.id,
        amount_kobo=payload.amount_kobo,
        paystack_reference=reference,
    )
    session.add(withdrawal)
    session.commit()
    session.refresh(withdrawal)

    try:
        transfer = initiate_transfer(
            payload.amount_kobo,
            account.recipient_code,
            reference,
            "My Autograph wallet withdrawal",
        )
    except HTTPException:
        _reverse_withdrawal(session, user, withdrawal, "Could not initiate transfer")
        session.commit()
        raise
    except httpx.HTTPError:
        _reverse_withdrawal(session, user, withdrawal, "Could not reach Paystack")
        session.commit()
        raise HTTPException(status_code=502, detail="Could not process withdrawal. Please try again.")

    status = transfer.get("status")
    withdrawal.paystack_transfer_code = transfer.get("transfer_code", "")

    if status == "success":
        withdrawal.status = WithdrawalStatus.paid
        withdrawal.paid_at = datetime.utcnow()
        session.add(
            WalletTransaction(
                user_id=user.id,
                type=WalletTransactionType.withdrawal,
                amount_kobo=-payload.amount_kobo,
                description=f"Withdrawal to {account.bank_name} ({account.account_number[-4:]})",
            )
        )
    elif status not in ("pending", "otp"):
        _reverse_withdrawal(session, user, withdrawal, transfer.get("message", "Transfer failed"))

    session.add(withdrawal)
    session.commit()
    session.refresh(withdrawal)
    return withdrawal


@router.get("/mine", response_model=list[WithdrawalRead])
def list_my_withdrawals(
    session: Session = Depends(get_session),
    user: User = Depends(require_role(*WITHDRAWAL_ROLES)),
):
    return session.exec(
        select(WalletWithdrawal)
        .where(WalletWithdrawal.user_id == user.id)
        .order_by(WalletWithdrawal.created_at.desc())
    ).all()
