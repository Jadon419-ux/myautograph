import hashlib
import hmac
import json

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import Session

from app.config import settings
from app.database import get_session
from app.deps import require_role
from app.models.user import RoleEnum, User
from app.schemas.ticket import TicketOrderRead
from app.services.paystack import verify_and_finalize

router = APIRouter(prefix="/payments", tags=["payments"])


@router.get("/verify", response_model=TicketOrderRead)
def verify_payment(
    reference: str,
    session: Session = Depends(get_session),
    user: User = Depends(require_role(RoleEnum.fan)),
):
    order = verify_and_finalize(session, reference)
    if order.buyer_user_id != user.id:
        raise HTTPException(status_code=404, detail="Order not found")
    return TicketOrderRead(**order.model_dump(), authorization_url=None)


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
        verify_and_finalize(session, reference)

    return {"status": "ok"}
