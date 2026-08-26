from datetime import datetime

from sqlmodel import Session, select

from app.models.user import User
from app.models.wallet import WalletTransaction, WalletTransactionType
from app.models.withdrawal import WalletWithdrawal, WithdrawalStatus


def finalize_transfer_webhook(session: Session, reference: str, status: str) -> None:
    """Reconcile a withdrawal against an async transfer.success/failed/reversed webhook.

    The request/response path already resolves most transfers synchronously;
    this is the safety net for ones that settle asynchronously on Paystack's
    side (e.g. requiring OTP confirmation) after we've already responded.
    """
    withdrawal = session.exec(
        select(WalletWithdrawal).where(WalletWithdrawal.paystack_reference == reference)
    ).first()
    if not withdrawal or withdrawal.status != WithdrawalStatus.pending:
        return

    if status == "success":
        withdrawal.status = WithdrawalStatus.paid
        withdrawal.paid_at = datetime.utcnow()
        session.add(
            WalletTransaction(
                user_id=withdrawal.user_id,
                type=WalletTransactionType.withdrawal,
                amount_kobo=-withdrawal.amount_kobo,
                description="Wallet withdrawal",
            )
        )
    else:
        user = session.get(User, withdrawal.user_id)
        if user:
            user.wallet_balance_kobo += withdrawal.amount_kobo
            session.add(user)
        withdrawal.status = WithdrawalStatus.failed
        withdrawal.failure_reason = f"Transfer {status}"

    session.add(withdrawal)
    session.commit()


def _name_tokens(name: str) -> list[str]:
    return [t for t in name.replace("-", " ").replace(".", " ").lower().split() if t]


def names_correlate(platform_full_name: str, bank_account_name: str) -> bool:
    """Whether the bank's registered name plausibly belongs to the same person.

    Bank account names come back in inconsistent orders (LAST FIRST MIDDLE,
    FIRST MIDDLE LAST, etc.), so this checks that the platform account's
    first and last name tokens both appear somewhere in the bank name,
    regardless of order — rather than requiring an exact string match.
    """
    platform_tokens = _name_tokens(platform_full_name)
    if len(platform_tokens) < 2:
        return False

    bank_tokens = set(_name_tokens(bank_account_name))
    first, last = platform_tokens[0], platform_tokens[-1]
    return first in bank_tokens and last in bank_tokens
