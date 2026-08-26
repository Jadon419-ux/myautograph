from datetime import datetime

import httpx
from fastapi import HTTPException
from sqlmodel import Session, select

from app.config import settings
from app.models.concert import Concert
from app.models.referral import ReferralLink
from app.models.ticket import Ticket, TicketStatus
from app.models.ticket_category import TicketCategory
from app.models.ticket_order import TicketOrder, TicketOrderStatus
from app.models.user import RoleEnum, User
from app.models.wallet import WalletTransaction, WalletTransactionType

PAYSTACK_BASE_URL = "https://api.paystack.co"

# The platform always keeps a fixed cut of a referred ticket sale; the rest
# of that cut (up to 100 - PLATFORM_TICKET_FEE_PERCENT) can be allocated by
# the concert's owner to the referring agent via Concert.agent_commission_percent.
# The buyer always pays the listed ticket price — no markup is added.
PLATFORM_TICKET_FEE_PERCENT = 7.0


def initialize_transaction(email: str, amount_kobo: int, reference: str) -> dict:
    if not settings.paystack_secret_key:
        raise HTTPException(status_code=503, detail="Payments are not configured yet")

    response = httpx.post(
        f"{PAYSTACK_BASE_URL}/transaction/initialize",
        json={
            "email": email,
            "amount": amount_kobo,
            "reference": reference,
            "callback_url": f"{settings.frontend_base_url}/payments/callback",
        },
        headers={"Authorization": f"Bearer {settings.paystack_secret_key}"},
        timeout=10,
    )
    response.raise_for_status()
    return response.json()["data"]


def verify_transaction(reference: str) -> dict:
    if not settings.paystack_secret_key:
        raise HTTPException(status_code=503, detail="Payments are not configured yet")

    try:
        response = httpx.get(
            f"{PAYSTACK_BASE_URL}/transaction/verify/{reference}",
            headers={"Authorization": f"Bearer {settings.paystack_secret_key}"},
            timeout=10,
        )
        response.raise_for_status()
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="Could not verify payment with Paystack")
    return response.json()["data"]


def verify_and_finalize(session: Session, reference: str) -> TicketOrder:
    order = session.exec(
        select(TicketOrder).where(TicketOrder.paystack_reference == reference)
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.status != TicketOrderStatus.pending:
        return order

    data = verify_transaction(reference)
    tickets = session.exec(select(Ticket).where(Ticket.order_id == order.id)).all()

    if data.get("status") == "success" and data.get("amount") == order.amount_kobo:
        order.status = TicketOrderStatus.paid
        order.paid_at = datetime.utcnow()
        for ticket in tickets:
            ticket.status = TicketStatus.valid
            session.add(ticket)

        referral_link_id = next((t.referral_link_id for t in tickets if t.referral_link_id), None)
        if referral_link_id:
            link = session.get(ReferralLink, referral_link_id)
            if link and link.invitee_role == RoleEnum.agent and link.invitee_user_id:
                concert = session.get(Concert, order.concert_id)
                category = session.get(TicketCategory, order.ticket_category_id)
                original_amount_kobo = (category.price_kobo * order.quantity) if category else 0
                commission_percent = concert.agent_commission_percent if concert else 0.0
                commission_kobo = round(original_amount_kobo * commission_percent / 100)
                if commission_kobo > 0:
                    agent_user = session.get(User, link.invitee_user_id)
                    if agent_user:
                        agent_user.wallet_balance_kobo += commission_kobo
                        session.add(agent_user)
                        session.add(
                            WalletTransaction(
                                user_id=agent_user.id,
                                type=WalletTransactionType.ticket_referral_commission,
                                amount_kobo=commission_kobo,
                                description=f"Ticket referral commission: {concert.title if concert else ''}",
                            )
                        )
    else:
        order.status = TicketOrderStatus.failed
        for ticket in tickets:
            ticket.status = TicketStatus.cancelled
            session.add(ticket)
        category = session.get(TicketCategory, order.ticket_category_id)
        if category:
            category.quantity_sold = max(0, category.quantity_sold - order.quantity)
            session.add(category)

    session.add(order)
    session.commit()
    session.refresh(order)
    return order
