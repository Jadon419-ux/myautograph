import uuid

from sqlmodel import Session

from app.models.concert import Concert
from app.models.ticket import Ticket, TicketStatus
from app.models.ticket_category import TicketCategory
from app.models.ticket_order import TicketOrder
from app.models.user import User


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
    for ticket in tickets:
        session.refresh(ticket)

    try:
        _send_purchase_confirmation(session, order, tickets)
    except Exception as exc:  # never let an email failure break ticket creation
        print(f"Failed to send ticket purchase email for order {order.id}: {exc}")

    return tickets


def _send_purchase_confirmation(session: Session, order: TicketOrder, tickets: list[Ticket]) -> None:
    from app.services.email import send_ticket_purchase_email
    from app.services.ticket_ids import ma_unique_id, ticket_number
    from app.services.ticket_pdf import build_receipt_pdf, build_tickets_pdf

    concert = session.get(Concert, order.concert_id)
    category = session.get(TicketCategory, order.ticket_category_id)
    buyer = session.get(User, order.buyer_user_id)

    to_email = order.recipient_email or (buyer.email if buyer else None)
    if not to_email:
        return

    account_name = buyer.full_name if buyer else (order.recipient_name or "there")
    event_time_text = concert.event_date.strftime("%d %b %Y, %I:%M %p") + " UTC" if concert else "-"
    purchase_time_text = (
        order.paid_at.strftime("%d %b %Y, %I:%M %p") + " UTC" if order.paid_at else "-"
    )
    ticket_lines = [
        f"{ticket_number(t.id)} (MA unique ID {ma_unique_id(t.buyer_user_id)})" for t in tickets
    ]

    ticket_pdf = build_tickets_pdf(session, tickets)
    receipt_pdf = build_receipt_pdf(session, order, concert, category, buyer)

    send_ticket_purchase_email(
        to_email=to_email,
        account_name=account_name,
        concert_title=concert.title if concert else "your event",
        venue=concert.venue if concert else "-",
        event_time_text=event_time_text,
        purchase_time_text=purchase_time_text,
        ticket_lines=ticket_lines,
        ticket_pdf=ticket_pdf,
        receipt_pdf=receipt_pdf,
    )
