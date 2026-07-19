from datetime import datetime

from fastapi import HTTPException
from sqlmodel import Session, select

from app.models.user import User
from app.models.wallet import (
    WalletFundingOrder,
    WalletFundingStatus,
    WalletTransaction,
    WalletTransactionType,
)
from app.services.paystack import verify_transaction


def verify_and_finalize_wallet_funding(session: Session, reference: str) -> WalletFundingOrder:
    order = session.exec(
        select(WalletFundingOrder).where(WalletFundingOrder.paystack_reference == reference)
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.status != WalletFundingStatus.pending:
        return order

    data = verify_transaction(reference)

    if data.get("status") == "success" and data.get("amount") == order.amount_kobo:
        order.status = WalletFundingStatus.paid
        order.paid_at = datetime.utcnow()

        user = session.get(User, order.user_id)
        user.wallet_balance_kobo += order.amount_kobo
        session.add(user)

        session.add(
            WalletTransaction(
                user_id=order.user_id,
                type=WalletTransactionType.funding,
                amount_kobo=order.amount_kobo,
                description="Wallet funding via Paystack",
            )
        )
    else:
        order.status = WalletFundingStatus.failed

    session.add(order)
    session.commit()
    session.refresh(order)
    return order
