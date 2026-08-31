import io

import httpx
import qrcode
from fpdf import FPDF
from PIL import Image
from sqlmodel import Session

from app.config import settings
from app.models.concert import Concert
from app.models.ticket import Ticket
from app.models.ticket_category import TicketCategory
from app.models.ticket_order import TicketOrder
from app.models.user import User
from app.services.ticket_ids import ma_unique_id, ticket_number

BRAND_GREEN = (67, 160, 71)
BRAND_GREEN_DARK = (46, 125, 50)
BRAND_CHARCOAL = (28, 28, 30)
BORDER_GRAY = (226, 226, 228)

PAGE_W = 320
PAGE_H = 620


def _verify_url(qr_token: str) -> str:
    return f"{settings.frontend_base_url}/tickets/verify/{qr_token}"


def _qr_png(qr_token: str) -> io.BytesIO:
    img = qrcode.make(_verify_url(qr_token), border=2)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf


def _fetch_flyer_jpeg(url: str, max_dim: int = 900) -> bytes | None:
    try:
        resp = httpx.get(url, timeout=10)
        resp.raise_for_status()
        image = Image.open(io.BytesIO(resp.content)).convert("RGB")
    except Exception:
        return None
    image.thumbnail((max_dim, max_dim))
    buf = io.BytesIO()
    image.save(buf, format="JPEG", quality=82, optimize=True)
    return buf.getvalue()


def _add_ticket_page(
    pdf: FPDF,
    ticket: Ticket,
    concert: Concert | None,
    category: TicketCategory | None,
    flyer_bytes: bytes | None,
) -> None:
    pdf.add_page()
    pdf.set_draw_color(*BORDER_GRAY)
    pdf.rect(4, 4, PAGE_W - 8, PAGE_H - 8)

    y = 16
    pdf.set_font("Helvetica", "B", 18)
    pdf.set_text_color(*BRAND_CHARCOAL)
    pdf.set_xy(0, y)
    pdf.cell(PAGE_W, 10, "My Autograph", align="C")
    y += 22

    pdf.set_fill_color(*BRAND_CHARCOAL)
    pdf.rect(4, y, PAGE_W - 8, 22, style="F")
    pdf.set_text_color(*BRAND_GREEN)
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_xy(0, y + 6)
    pdf.cell(PAGE_W, 10, "* EVENT TICKET *", align="C")
    y += 34

    if flyer_bytes is not None:
        flyer_h = 110
        pdf.image(io.BytesIO(flyer_bytes), x=14, y=y, w=PAGE_W - 28, h=flyer_h)
        y += flyer_h + 10

    qr_buf = _qr_png(ticket.qr_token)
    qr_size = 140
    qr_x = (PAGE_W - qr_size) / 2
    pdf.set_draw_color(*BORDER_GRAY)
    pdf.rect(qr_x - 6, y - 6, qr_size + 12, qr_size + 12)
    pdf.image(qr_buf, x=qr_x, y=y, w=qr_size, h=qr_size)
    y += qr_size + 8

    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(100, 100, 100)
    pdf.set_xy(0, y)
    pdf.cell(PAGE_W, 8, "Scan to verify & gain entry", align="C")
    y += 18

    pdf.set_draw_color(*BORDER_GRAY)
    pdf.dashed_line(14, y, PAGE_W - 14, y, dash_length=3, space_length=2)
    y += 10

    def field(label: str, value: str) -> None:
        nonlocal y
        pdf.set_xy(14, y)
        pdf.set_font("Helvetica", "B", 8)
        pdf.set_text_color(*BRAND_GREEN_DARK)
        pdf.cell(PAGE_W - 28, 8, label.upper())
        y += 9
        pdf.set_xy(14, y)
        pdf.set_font("Helvetica", "B", 11)
        pdf.set_text_color(*BRAND_CHARCOAL)
        pdf.cell(PAGE_W - 28, 8, value)
        y += 14

    field("Ticket holder", ticket.recipient_name or "Guest")
    field("MA unique ID", ma_unique_id(ticket.buyer_user_id))
    field("Ticket ID", ticket_number(ticket.id))
    if concert:
        field("Event", concert.title)
        pdf.set_xy(14, y - 8)
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(120, 120, 120)
        pdf.cell(
            PAGE_W - 28,
            8,
            f"{concert.venue} - {concert.event_date.strftime('%d %b %Y, %I:%M %p')}",
        )
        y += 10
    if category:
        field("Category", category.name)

    y += 4
    pdf.set_fill_color(*BRAND_CHARCOAL)
    pdf.rect(14, y, PAGE_W - 28, 34, style="F")
    pdf.set_text_color(*BRAND_GREEN)
    pdf.set_font("Helvetica", "B", 10)
    status_label = {
        "valid": "VERIFIED TICKET",
        "checked_in": "CHECKED IN",
        "cancelled": "CANCELLED",
        "pending_payment": "PENDING PAYMENT",
    }.get(ticket.status.value if hasattr(ticket.status, "value") else str(ticket.status), "TICKET")
    pdf.set_xy(14, y + 6)
    pdf.cell(PAGE_W - 28, 8, status_label, align="C")
    pdf.set_font("Helvetica", "", 7)
    pdf.set_text_color(210, 210, 210)
    pdf.set_xy(18, y + 17)
    pdf.multi_cell(PAGE_W - 36, 6, "Valid - Secure - Non-transferable unless transferred through My Autograph", align="C")

    pdf.set_fill_color(*BRAND_GREEN)
    pdf.rect(4, PAGE_H - 26, PAGE_W - 8, 22, style="F")
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_xy(0, PAGE_H - 20)
    pdf.cell(PAGE_W, 10, "myautographma.com", align="C")


def build_tickets_pdf(session: Session, tickets: list[Ticket]) -> bytes:
    pdf = FPDF(unit="pt", format=(PAGE_W, PAGE_H))
    pdf.set_auto_page_break(False)
    flyer_cache: dict[int, bytes | None] = {}
    for ticket in tickets:
        concert = session.get(Concert, ticket.concert_id)
        category = session.get(TicketCategory, ticket.ticket_category_id)
        flyer_bytes = None
        if concert and concert.flyer_url:
            if concert.id not in flyer_cache:
                flyer_cache[concert.id] = _fetch_flyer_jpeg(concert.flyer_url)
            flyer_bytes = flyer_cache[concert.id]
        _add_ticket_page(pdf, ticket, concert, category, flyer_bytes)
    return bytes(pdf.output())


def build_receipt_pdf(
    session: Session,
    order: TicketOrder,
    concert: Concert | None,
    category: TicketCategory | None,
    buyer: User | None,
) -> bytes:
    pdf = FPDF(unit="pt", format="A4")
    pdf.set_auto_page_break(True, margin=40)
    pdf.add_page()

    pdf.set_font("Helvetica", "B", 20)
    pdf.set_text_color(*BRAND_CHARCOAL)
    pdf.cell(0, 16, "My Autograph", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 11)
    pdf.set_text_color(100, 100, 100)
    pdf.cell(0, 14, "Purchase Receipt", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(10)

    def row(label: str, value: str) -> None:
        pdf.set_font("Helvetica", "B", 10)
        pdf.set_text_color(*BRAND_GREEN_DARK)
        pdf.cell(140, 16, label)
        pdf.set_font("Helvetica", "", 10)
        pdf.set_text_color(*BRAND_CHARCOAL)
        pdf.cell(0, 16, value, new_x="LMARGIN", new_y="NEXT")

    row("Receipt reference", order.paystack_reference)
    row("Account name", buyer.full_name if buyer else order.recipient_name)
    row("Account email", buyer.email if buyer else order.recipient_email)
    row("Purchased on", order.paid_at.strftime("%d %b %Y, %I:%M %p") + " UTC" if order.paid_at else "-")
    pdf.ln(6)

    row("Event", concert.title if concert else "-")
    row("Venue", concert.venue if concert else "-")
    row(
        "Event time",
        concert.event_date.strftime("%d %b %Y, %I:%M %p") + " UTC" if concert else "-",
    )
    row("Ticket category", category.name if category else "-")
    row("Quantity", str(order.quantity))
    row(
        "Amount paid",
        "Free" if order.amount_kobo == 0 else f"NGN {order.amount_kobo / 100:,.2f}",
    )

    pdf.ln(20)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(140, 140, 140)
    pdf.multi_cell(
        0,
        14,
        "This receipt confirms payment for the ticket(s) described above. "
        "Keep it for your records. For support, contact My Autograph.",
    )

    return bytes(pdf.output())
