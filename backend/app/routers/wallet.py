import uuid

import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.database import get_session
from app.deps import get_current_user
from app.models.user import User
from app.models.wallet import WalletFundingOrder, WalletTransaction
from app.schemas.wallet import (
    FundWalletRequest,
    WalletFundingOrderRead,
    WalletRead,
    WalletTransactionRead,
)
from app.services.paystack import initialize_transaction

router = APIRouter(prefix="/wallet", tags=["wallet"])

MIN_FUNDING_KOBO = 10000


@router.get("/me", response_model=WalletRead)
def get_my_wallet(user: User = Depends(get_current_user)):
    return WalletRead(balance_kobo=user.wallet_balance_kobo)


@router.get("/transactions", response_model=list[WalletTransactionRead])
def list_my_transactions(
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    return session.exec(
        select(WalletTransaction)
        .where(WalletTransaction.user_id == user.id)
        .order_by(WalletTransaction.created_at.desc())
    ).all()


@router.post("/fund", response_model=WalletFundingOrderRead)
def fund_wallet(
    payload: FundWalletRequest,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    if payload.amount_kobo < MIN_FUNDING_KOBO:
        raise HTTPException(status_code=400, detail="Minimum funding amount is ₦100")

    order = WalletFundingOrder(
        user_id=user.id,
        amount_kobo=payload.amount_kobo,
        paystack_reference=uuid.uuid4().hex,
    )
    session.add(order)
    session.commit()
    session.refresh(order)

    try:
        data = initialize_transaction(user.email, payload.amount_kobo, order.paystack_reference)
        authorization_url = data.get("authorization_url")
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="Could not initialize payment. Please try again.")

    return WalletFundingOrderRead(**order.model_dump(), authorization_url=authorization_url)
