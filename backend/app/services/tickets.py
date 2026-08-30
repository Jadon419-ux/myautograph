import uuid

from sqlmodel import Session

from app.models.ticket import Ticket, TicketStatus
from app.models.ticket_order import TicketOrder


def create_tickets_for_order(session: Session, order: TicketOrder) -> list[Ticket]:
    tickets = [
        Ticket(
            ticket_category_id=order.ticket_category_id,
            concert_id=order.concert_id,
            order_id=order.id,
            buyer_user_id=order.buyer_user_id,
            recipient_name=order.recipient_name,
            recipient_email=order.recipient_email,
            referral_link_id=order.referral_link_id,
            qr_token=uuid.uuid4().hex,
            status=TicketStatus.valid,
        )
        for _ in range(order.quantity)
    ]
    session.add_all(tickets)
    session.commit()
    return tickets
