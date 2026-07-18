import hashlib
import hmac
import json

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import Session, select

from app.config import settings
from app.database import get_session
from app.deps import get_current_user
from app.models.ticket_order import TicketOrder
from app.models.marketplace import MarketplaceOrder
from app.models.user import User
from app.schemas.marketplace import MarketplaceOrderRead
from app.schemas.ticket import TicketOrderRead
from app.services.marketplace import verify_and_finalize_marketplace_order
from app.services.paystack import verify_and_finalize

router = APIRouter(prefix="/payments", tags=["payments"])


def _finalize_by_reference(session: Session, reference: str):
    if session.exec(select(TicketOrder).where(TicketOrder.paystack_reference == reference)).first():
        return verify_and_finalize(session, reference), "ticket"
    if session.exec(
        select(MarketplaceOrder).where(MarketplaceOrder.paystack_reference == reference)
    ).first():
        return verify_and_finalize_marketplace_order(session, reference), "marketplace"
    raise HTTPException(status_code=404, detail="Order not found")


@router.get("/verify")
def verify_payment(
    reference: str,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    order, kind = _finalize_by_reference(session, reference)
    if order.buyer_user_id != user.id:
        raise HTTPException(status_code=404, detail="Order not found")
    if kind == "ticket":
        return TicketOrderRead(**order.model_dump(), authorization_url=None)
    return MarketplaceOrderRead(**order.model_dump(), authorization_url=None)


@router.post("/webhook")
async def paystack_webhook(request: Request, session: Session = Depends(get_session)):
    body = await request.body()
    expected_signature = hmac.new(
        settings.paystack_secret_key.encode(), body, hashlib.sha512
    ).hexdigest()
    signature = request.headers.get("x-paystack-signature", "")

    if not settings.paystack_secret_key or not hmac.compare_digest(expected_signature, signature):
        raise HTTPException(status_code=400, detail="Invalid signature")

    payload = json.loads(body)
    reference = payload.get("data", {}).get("reference")
    if reference:
        try:
            _finalize_by_reference(session, reference)
        except HTTPException:
            pass

    return {"status": "ok"}
