import io
from pathlib import Path

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
STATUS_BG = {
    "valid": (28, 28, 30),
    "checked_in": (23, 37, 84),
    "cancelled": (69, 10, 10),
    "pending_payment": (69, 56, 8),
}
STATUS_ACCENT = {
    "valid": BRAND_GREEN,
    "checked_in": (96, 165, 250),
    "cancelled": (248, 113, 113),
    "pending_payment": (250, 204, 21),
}
STATUS_LABEL = {
    "valid": "VERIFIED TICKET",
    "checked_in": "CHECKED IN",
    "cancelled": "CANCELLED",
    "pending_payment": "PENDING PAYMENT",
}
MOTTO = "Connecting Fans. Empowering Stars. Creating Memories."
LOGO_PATH = Path(__file__).resolve().parent.parent / "assets" / "icon-mark.png"

STUB_W = 288
FLYER_W = 300
DIVIDER_GAP = 14
OUTER_MARGIN = 4
STUB_H = 578


def _verify_url(qr_token: str) -> str:
    return f"{settings.frontend_base_url}/tickets/verify/{qr_token}"


def _qr_png(qr_token: str) -> io.BytesIO:
    img = qrcode.make(_verify_url(qr_token), border=1)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf


def _cover_crop(image: Image.Image, target_w: float, target_h: float) -> Image.Image:
    target_ratio = target_w / target_h
    src_ratio = image.width / image.height
    if src_ratio > target_ratio:
        new_width = max(1, int(image.height * target_ratio))
        left = (image.width - new_width) // 2
        image = image.crop((left, 0, left + new_width, image.height))
    else:
        new_height = max(1, int(image.width / target_ratio))
        top = (image.height - new_height) // 2
        image = image.crop((0, top, image.width, top + new_height))
    return image


def _fetch_flyer_jpeg(url: str, target_w: float, target_h: float) -> bytes | None:
    try:
        resp = httpx.get(url, timeout=10)
        resp.raise_for_status()
        image = Image.open(io.BytesIO(resp.content)).convert("RGB")
    except Exception:
        return None
    image = _cover_crop(image, target_w, target_h)
    image.thumbnail((int(target_w * 2), int(target_h * 2)))
    buf = io.BytesIO()
    image.save(buf, format="JPEG", quality=82, optimize=True)
    return buf.getvalue()


def _status_key(ticket: Ticket) -> str:
    return ticket.status.value if hasattr(ticket.status, "value") else str(ticket.status)


def _draw_stub(pdf: FPDF, x0: float, ticket: Ticket, concert: Concert | None, category: TicketCategory | None) -> None:
    cx = x0 + STUB_W / 2
    y = OUTER_MARGIN + 18

    icon_size = 36
    gap = 10
    pdf.set_font("Helvetica", "B", 16)
    text_w = pdf.get_string_width("My Autograph")
    group_w = icon_size + gap + text_w
    icon_x = cx - group_w / 2
    text_x = icon_x + icon_size + gap
    if LOGO_PATH.exists():
        pdf.image(str(LOGO_PATH), x=icon_x, y=y, w=icon_size, h=icon_size)
    pdf.set_xy(text_x, y + (icon_size - 16) / 2)
    pdf.set_text_color(*BRAND_CHARCOAL)
    pdf.cell(text_w + 4, 16, "My Autograph")
    y += icon_size + 20

    pdf.set_fill_color(*BRAND_CHARCOAL)
    pdf.rect(x0, y, STUB_W, 26, style="F")
    pdf.set_text_color(*BRAND_GREEN)
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_xy(x0, y + 7)
    pdf.cell(STUB_W, 10, "* EVENT TICKET *", align="C")
    y += 26 + 16

    box_x = x0 + 20
    box_w = STUB_W - 40
    pdf.set_fill_color(*BRAND_GREEN_DARK)
    pdf.rect(box_x, y, box_w, 22, style="F")
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_xy(box_x, y + 6)
    pdf.cell(box_w, 10, "SCAN TO VERIFY", align="C")
    y += 22

    qr_size = 150
    qr_area_h = qr_size + 28
    pdf.set_draw_color(*BORDER_GRAY)
    pdf.rect(box_x, y, box_w, qr_area_h)
    qr_buf = _qr_png(ticket.qr_token)
    pdf.image(qr_buf, x=cx - qr_size / 2, y=y + 14, w=qr_size, h=qr_size)
    y += qr_area_h + 16

    pdf.set_draw_color(*BORDER_GRAY)
    pdf.dashed_line(x0 + 20, y, x0 + STUB_W - 20, y, dash_length=3, space_length=2)
    y += 14

    def field(label: str, value: str) -> None:
        nonlocal y
        pdf.set_xy(x0 + 20, y)
        pdf.set_font("Helvetica", "B", 8)
        pdf.set_text_color(*BRAND_GREEN_DARK)
        pdf.cell(STUB_W - 40, 8, label.upper())
        y += 10
        pdf.set_xy(x0 + 20, y)
        pdf.set_font("Helvetica", "B", 12)
        pdf.set_text_color(*BRAND_CHARCOAL)
        pdf.cell(STUB_W - 40, 10, value)
        y += 16

    field("Ticket holder", ticket.recipient_name or "Guest")
    field("MA unique ID", ma_unique_id(ticket.buyer_user_id))
    field("Ticket ID", ticket_number(ticket.id))
    if concert:
        pdf.set_xy(x0 + 20, y)
        pdf.set_font("Helvetica", "B", 8)
        pdf.set_text_color(*BRAND_GREEN_DARK)
        pdf.cell(STUB_W - 40, 8, "EVENT")
        y += 10
        pdf.set_xy(x0 + 20, y)
        pdf.set_font("Helvetica", "B", 12)
        pdf.set_text_color(*BRAND_CHARCOAL)
        pdf.cell(STUB_W - 40, 10, concert.title)
        y += 14
        pdf.set_xy(x0 + 20, y)
        pdf.set_font("Helvetica", "", 8)
        pdf.set_text_color(120, 120, 120)
        pdf.cell(STUB_W - 40, 8, f"{concert.venue} - {concert.event_date.strftime('%d %b %Y, %I:%M %p')}")
        y += 14

    y += 8
    status = _status_key(ticket)
    pdf.set_fill_color(*STATUS_BG.get(status, BRAND_CHARCOAL))
    badge_h = 58
    pdf.rect(box_x, y, box_w, badge_h, style="F")
    pdf.set_text_color(*STATUS_ACCENT.get(status, BRAND_GREEN))
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_xy(box_x, y + 8)
    pdf.cell(box_w, 10, STATUS_LABEL.get(status, "TICKET"), align="C")
    pdf.set_font("Helvetica", "", 7)
    pdf.set_text_color(200, 200, 200)
    pdf.set_xy(box_x + 6, y + 20)
    pdf.multi_cell(box_w - 12, 8, "Valid - Secure - Non-transferable unless transferred through My Autograph", align="C")
    y += badge_h + 16

    footer_y = y
    pdf.set_fill_color(*BRAND_GREEN)
    pdf.rect(x0, footer_y, STUB_W, 26, style="F")
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_xy(x0, footer_y + 8)
    pdf.cell(STUB_W, 10, "myautographma.com", align="C")


def _add_ticket_page(
    pdf: FPDF,
    ticket: Ticket,
    concert: Concert | None,
    category: TicketCategory | None,
    flyer_bytes: bytes | None,
) -> None:
    has_flyer = flyer_bytes is not None
    stub_x0 = OUTER_MARGIN + FLYER_W + DIVIDER_GAP if has_flyer else OUTER_MARGIN
    page_w = stub_x0 + STUB_W + OUTER_MARGIN
    pdf.add_page(format=(page_w, STUB_H))

    pdf.set_draw_color(*BORDER_GRAY)
    pdf.rect(OUTER_MARGIN, OUTER_MARGIN, page_w - 2 * OUTER_MARGIN, STUB_H - 2 * OUTER_MARGIN)

    if has_flyer:
        pdf.image(
            io.BytesIO(flyer_bytes),
            x=OUTER_MARGIN,
            y=OUTER_MARGIN,
            w=FLYER_W,
            h=STUB_H - 2 * OUTER_MARGIN,
        )
        divider_x = OUTER_MARGIN + FLYER_W + DIVIDER_GAP / 2
        pdf.set_draw_color(*BORDER_GRAY)
        pdf.dashed_line(divider_x, OUTER_MARGIN, divider_x, STUB_H - OUTER_MARGIN, dash_length=4, space_length=3)

    _draw_stub(pdf, stub_x0, ticket, concert, category)


def build_tickets_pdf(session: Session, tickets: list[Ticket]) -> bytes:
    pdf = FPDF(unit="pt", format=(STUB_W + 2 * OUTER_MARGIN, STUB_H))
    pdf.set_auto_page_break(False)
    flyer_cache: dict[str, bytes | None] = {}
    for ticket in tickets:
        concert = session.get(Concert, ticket.concert_id)
        category = session.get(TicketCategory, ticket.ticket_category_id)
        # A ticket type's own image takes priority over the event's public flyer.
        flyer_url = (category.flyer_url if category and category.flyer_url else None) or (
            concert.flyer_url if concert else None
        )
        flyer_bytes = None
        if flyer_url:
            if flyer_url not in flyer_cache:
                flyer_cache[flyer_url] = _fetch_flyer_jpeg(
                    flyer_url, FLYER_W, STUB_H - 2 * OUTER_MARGIN
                )
            flyer_bytes = flyer_cache[flyer_url]
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

    pdf.ln(28)
    page_w = pdf.w
    if LOGO_PATH.exists():
        logo_size = 34
        pdf.image(str(LOGO_PATH), x=(page_w - logo_size) / 2, y=pdf.get_y(), w=logo_size, h=logo_size)
        pdf.set_y(pdf.get_y() + logo_size + 8)
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(*BRAND_CHARCOAL)
    pdf.cell(0, 14, "My Autograph", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "I", 9)
    pdf.set_text_color(*BRAND_GREEN_DARK)
    pdf.cell(0, 14, MOTTO, align="C", new_x="LMARGIN", new_y="NEXT")

    return bytes(pdf.output())
