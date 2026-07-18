from datetime import datetime

import httpx
from fastapi import HTTPException
from sqlmodel import Session, select

from app.config import settings
from app.models.ticket import Ticket, TicketStatus
from app.models.ticket_category import TicketCategory
from app.models.ticket_order import TicketOrder, TicketOrderStatus

PAYSTACK_BASE_URL = "https://api.paystack.co"


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
