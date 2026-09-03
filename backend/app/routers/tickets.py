import uuid
from datetime import datetime

import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.database import get_session
from app.deps import require_role
from app.models.celebrity import CelebrityProfile
from app.models.concert import Concert
from app.models.referral import ReferralLink, ReferralLinkStatus
from app.models.ticket import Ticket, TicketStatus
from app.models.ticket_category import TicketCategory
from app.models.ticket_order import TicketOrder, TicketOrderStatus
from app.models.user import RoleEnum, User
from app.schemas.ticket import (
    AgentInviteCreate,
    ConcertAnalyticsRead,
    ReferralInviteCreate,
    ReferralLinkRead,
    SalesAgentInviteCreate,
    SellerBreakdown,
    TicketCategoryCreate,
    TicketCategoryRead,
    TicketCategoryUpdate,
    TicketOrderCreate,
    TicketOrderRead,
    TicketRead,
    TicketVerifyRead,
)
from app.services.paystack import initialize_transaction
from app.services.ticket_ids import ma_unique_id, ticket_number
from app.services.tickets import create_tickets_for_order

router = APIRouter(prefix="/tickets", tags=["tickets"])


def _get_owned_concert(session: Session, concert_id: int, user: User) -> Concert:
    concert = session.get(Concert, concert_id)
    if not concert or concert.agent_id != user.id:
        raise HTTPException(status_code=404, detail="Concert not found")
    return concert


def _get_owned_category(session: Session, category_id: int, user: User) -> TicketCategory:
    category = session.get(TicketCategory, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Ticket category not found")
    _get_owned_concert(session, category.concert_id, user)
    return category


def _resolve_ticket_flyer_url(concert: Concert | None, category: TicketCategory | None) -> str | None:
    # A ticket type's own image (shown on the actual ticket) takes priority over
    # the event's public promotional flyer.
    if category and category.flyer_url:
        return category.flyer_url
    return concert.flyer_url if concert else None


def _build_ticket_read(session: Session, ticket: Ticket) -> TicketRead:
    concert = session.get(Concert, ticket.concert_id)
    category = session.get(TicketCategory, ticket.ticket_category_id)
    buyer = session.get(User, ticket.buyer_user_id)
    return TicketRead(
        **ticket.model_dump(),
        ma_unique_id=ma_unique_id(ticket.buyer_user_id),
        ticket_number=ticket_number(ticket.id),
        concert_title=concert.title if concert else "",
        venue=concert.venue if concert else "",
        event_date=concert.event_date if concert else ticket.created_at,
        category_name=category.name if category else "",
        holder_avatar_url=buyer.avatar_url if buyer else None,
        concert_flyer_url=_resolve_ticket_flyer_url(concert, category),
    )


# ---- Ticket categories ----


@router.post("/concerts/{concert_id}/categories", response_model=TicketCategoryRead)
def create_category(
    concert_id: int,
    payload: TicketCategoryCreate,
    session: Session = Depends(get_session),
    user: User = Depends(require_role(RoleEnum.agent, RoleEnum.manager)),
):
    _get_owned_concert(session, concert_id, user)
    category = TicketCategory(concert_id=concert_id, **payload.model_dump())
    session.add(category)
    session.commit()
    session.refresh(category)
    return category


@router.get("/concerts/{concert_id}/categories", response_model=list[TicketCategoryRead])
def list_categories(concert_id: int, session: Session = Depends(get_session)):
    return session.exec(
        select(TicketCategory).where(TicketCategory.concert_id == concert_id)
    ).all()


@router.patch("/categories/{category_id}", response_model=TicketCategoryRead)
def update_category(
    category_id: int,
    payload: TicketCategoryUpdate,
    session: Session = Depends(get_session),
    user: User = Depends(require_role(RoleEnum.agent, RoleEnum.manager)),
):
    category = _get_owned_category(session, category_id, user)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(category, key, value)
    session.add(category)
    session.commit()
    session.refresh(category)
    return category


@router.delete("/categories/{category_id}", status_code=204)
def delete_category(
    category_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(require_role(RoleEnum.agent, RoleEnum.manager)),
):
    category = _get_owned_category(session, category_id, user)
    if category.quantity_sold > 0:
        raise HTTPException(status_code=400, detail="Cannot delete a category with sold tickets")
    session.delete(category)
    session.commit()


# ---- Referral links ----


@router.post("/concerts/{concert_id}/referrals", response_model=ReferralLinkRead)
def invite_celebrity_seller(
    concert_id: int,
    payload: ReferralInviteCreate,
    session: Session = Depends(get_session),
    user: User = Depends(require_role(RoleEnum.agent)),
):
    _get_owned_concert(session, concert_id, user)
    celebrity = session.get(CelebrityProfile, payload.celebrity_id)
    if not celebrity:
        raise HTTPException(status_code=404, detail="Celebrity not found")

    link = ReferralLink(
        concert_id=concert_id,
        code=uuid.uuid4().hex[:10],
        inviter_user_id=user.id,
        invitee_role=RoleEnum.celebrity,
        invitee_user_id=celebrity.user_id,
        commission_percent=payload.commission_percent,
    )
    session.add(link)
    session.commit()
    session.refresh(link)
    return link


@router.post("/concerts/{concert_id}/referrals/sales-agents", response_model=ReferralLinkRead)
def invite_sales_agent(
    concert_id: int,
    payload: SalesAgentInviteCreate,
    session: Session = Depends(get_session),
    user: User = Depends(require_role(RoleEnum.celebrity)),
):
    own_link = session.exec(
        select(ReferralLink).where(
            ReferralLink.concert_id == concert_id,
            ReferralLink.invitee_user_id == user.id,
            ReferralLink.invitee_role == RoleEnum.celebrity,
            ReferralLink.status == ReferralLinkStatus.accepted,
        )
    ).first()
    if not own_link:
        raise HTTPException(
            status_code=403, detail="You must be an approved seller for this concert first"
        )

    link = ReferralLink(
        concert_id=concert_id,
        code=uuid.uuid4().hex[:10],
        inviter_user_id=user.id,
        invitee_role=RoleEnum.sales_agent,
        invitee_user_id=None,
        parent_referral_link_id=own_link.id,
        commission_percent=payload.commission_percent,
    )
    session.add(link)
    session.commit()
    session.refresh(link)
    return link


@router.post("/concerts/{concert_id}/referrals/agents", response_model=ReferralLinkRead)
def invite_agent_seller(
    concert_id: int,
    payload: AgentInviteCreate,
    session: Session = Depends(get_session),
    user: User = Depends(require_role(RoleEnum.manager)),
):
    concert = _get_owned_concert(session, concert_id, user)

    agent = session.exec(select(User).where(User.email == payload.email)).first()
    if not agent or agent.role != RoleEnum.agent:
        raise HTTPException(status_code=404, detail="No agent account found with that email")

    link = ReferralLink(
        concert_id=concert_id,
        code=uuid.uuid4().hex[:10],
        inviter_user_id=user.id,
        invitee_role=RoleEnum.agent,
        invitee_user_id=agent.id,
        commission_percent=concert.agent_commission_percent,
    )
    session.add(link)
    session.commit()
    session.refresh(link)
    return link


@router.get("/referrals/mine", response_model=list[ReferralLinkRead])
def list_my_referrals(
    session: Session = Depends(get_session),
    user: User = Depends(
        require_role(RoleEnum.celebrity, RoleEnum.sales_agent, RoleEnum.agent, RoleEnum.manager)
    ),
):
    return session.exec(
        select(ReferralLink).where(
            (ReferralLink.inviter_user_id == user.id) | (ReferralLink.invitee_user_id == user.id)
        )
    ).all()


@router.post("/referrals/{referral_id}/accept", response_model=ReferralLinkRead)
def accept_referral(
    referral_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(require_role(RoleEnum.celebrity, RoleEnum.sales_agent, RoleEnum.agent)),
):
    link = session.get(ReferralLink, referral_id)
    if not link or link.invitee_user_id != user.id or link.status != ReferralLinkStatus.pending:
        raise HTTPException(status_code=404, detail="Referral invite not found")
    link.status = ReferralLinkStatus.accepted
    link.accepted_at = datetime.utcnow()
    session.add(link)
    session.commit()
    session.refresh(link)
    return link


@router.post("/referrals/{referral_id}/decline", response_model=ReferralLinkRead)
def decline_referral(
    referral_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(require_role(RoleEnum.celebrity, RoleEnum.sales_agent, RoleEnum.agent)),
):
    link = session.get(ReferralLink, referral_id)
    if not link or link.invitee_user_id != user.id or link.status != ReferralLinkStatus.pending:
        raise HTTPException(status_code=404, detail="Referral invite not found")
    link.status = ReferralLinkStatus.declined
    session.add(link)
    session.commit()
    session.refresh(link)
    return link


# ---- Orders / purchase ----


def _release_reservation(session: Session, order: TicketOrder) -> None:
    order.status = TicketOrderStatus.failed
    session.add(order)
    category = session.get(TicketCategory, order.ticket_category_id)
    if category:
        category.quantity_sold = max(0, category.quantity_sold - order.quantity)
        session.add(category)
    session.commit()


@router.post("/orders", response_model=TicketOrderRead)
def create_order(
    payload: TicketOrderCreate,
    session: Session = Depends(get_session),
    user: User = Depends(require_role(RoleEnum.fan, RoleEnum.admin)),
):
    category = session.get(TicketCategory, payload.category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Ticket category not found")

    now = datetime.utcnow()
    if not (category.sales_start <= now <= category.sales_end):
        raise HTTPException(status_code=400, detail="Ticket sales are not open for this category")
    if category.quantity_total - category.quantity_sold < payload.quantity:
        raise HTTPException(status_code=400, detail="Not enough tickets available")

    referral_link_id = None
    if payload.referral_code:
        link = session.exec(
            select(ReferralLink).where(
                ReferralLink.code == payload.referral_code,
                ReferralLink.concert_id == category.concert_id,
                ReferralLink.status == ReferralLinkStatus.accepted,
            )
        ).first()
        if not link:
            raise HTTPException(status_code=400, detail="Invalid referral code")
        referral_link_id = link.id

    category.quantity_sold += payload.quantity
    session.add(category)

    is_free = category.is_free or category.price_kobo == 0
    amount_kobo = 0 if is_free else category.price_kobo * payload.quantity

    order = TicketOrder(
        buyer_user_id=user.id,
        concert_id=category.concert_id,
        ticket_category_id=category.id,
        quantity=payload.quantity,
        paystack_reference=uuid.uuid4().hex,
        amount_kobo=amount_kobo,
        recipient_name=payload.recipient_name or user.full_name,
        recipient_email=payload.recipient_email or user.email,
        referral_link_id=referral_link_id,
    )
    session.add(order)
    session.commit()
    session.refresh(order)

    # Tickets (and their QR codes) are only created once a payment actually
    # succeeds - a failed or abandoned checkout never produces a ticket, so
    # the buyer's ticket vault never fills up with unusable entries.
    authorization_url = None
    if is_free:
        order.status = TicketOrderStatus.paid
        order.paid_at = datetime.utcnow()
        session.add(order)
        session.commit()
        session.refresh(order)
        create_tickets_for_order(session, order)
        # create_tickets_for_order() commits internally, which expires this
        # order's attributes - refresh again before reading them below.
        session.refresh(order)
    else:
        try:
            data = initialize_transaction(user.email, amount_kobo, order.paystack_reference)
            authorization_url = data.get("authorization_url")
        except HTTPException:
            _release_reservation(session, order)
            raise
        except httpx.HTTPError:
            _release_reservation(session, order)
            raise HTTPException(status_code=502, detail="Could not initialize payment. Please try again.")

    return TicketOrderRead(**order.model_dump(), authorization_url=authorization_url)


@router.get("/orders/{order_id}", response_model=TicketOrderRead)
def get_order(
    order_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(require_role(RoleEnum.fan, RoleEnum.admin)),
):
    order = session.get(TicketOrder, order_id)
    if not order or order.buyer_user_id != user.id:
        raise HTTPException(status_code=404, detail="Order not found")
    return TicketOrderRead(**order.model_dump(), authorization_url=None)


@router.get("/my", response_model=list[TicketRead])
def list_my_tickets(
    session: Session = Depends(get_session),
    user: User = Depends(require_role(RoleEnum.fan, RoleEnum.admin)),
):
    tickets = session.exec(select(Ticket).where(Ticket.buyer_user_id == user.id)).all()
    return [_build_ticket_read(session, ticket) for ticket in tickets]


# ---- Public verification ----
# Anyone scanning a ticket's QR code lands here, no login required. Only
# non-sensitive display fields are exposed - never wallet/financial data.


@router.get("/verify/{qr_token}", response_model=TicketVerifyRead)
def verify_ticket_public(qr_token: str, session: Session = Depends(get_session)):
    ticket = session.exec(select(Ticket).where(Ticket.qr_token == qr_token)).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    concert = session.get(Concert, ticket.concert_id)
    category = session.get(TicketCategory, ticket.ticket_category_id)
    buyer = session.get(User, ticket.buyer_user_id)

    return TicketVerifyRead(
        ticket_number=ticket_number(ticket.id),
        ma_unique_id=ma_unique_id(ticket.buyer_user_id),
        holder_name=ticket.recipient_name or (buyer.full_name if buyer else "Guest"),
        holder_avatar_url=buyer.avatar_url if buyer else None,
        concert_title=concert.title if concert else "",
        venue=concert.venue if concert else "",
        event_date=concert.event_date if concert else ticket.created_at,
        category_name=category.name if category else "",
        status=ticket.status,
        checked_in_at=ticket.checked_in_at,
        concert_flyer_url=_resolve_ticket_flyer_url(concert, category),
    )


# ---- Check-in ----


def _get_ticket_for_organizer(session: Session, qr_token: str, user: User) -> Ticket:
    ticket = session.exec(select(Ticket).where(Ticket.qr_token == qr_token)).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    _get_owned_concert(session, ticket.concert_id, user)
    return ticket


@router.get("/checkin/{qr_token}", response_model=TicketRead)
def preview_ticket(
    qr_token: str,
    session: Session = Depends(get_session),
    user: User = Depends(require_role(RoleEnum.agent, RoleEnum.manager)),
):
    ticket = _get_ticket_for_organizer(session, qr_token, user)
    return _build_ticket_read(session, ticket)


@router.post("/checkin/{qr_token}", response_model=TicketRead)
def check_in_ticket(
    qr_token: str,
    session: Session = Depends(get_session),
    user: User = Depends(require_role(RoleEnum.agent, RoleEnum.manager)),
):
    ticket = _get_ticket_for_organizer(session, qr_token, user)
    if ticket.status == TicketStatus.checked_in:
        raise HTTPException(status_code=409, detail="Ticket already checked in")
    if ticket.status != TicketStatus.valid:
        raise HTTPException(status_code=400, detail=f"Ticket is not valid (status: {ticket.status})")

    ticket.status = TicketStatus.checked_in
    ticket.checked_in_at = datetime.utcnow()
    session.add(ticket)
    session.commit()
    session.refresh(ticket)
    return _build_ticket_read(session, ticket)


# ---- Analytics ----


@router.get("/concerts/{concert_id}/analytics", response_model=ConcertAnalyticsRead)
def get_analytics(
    concert_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(require_role(RoleEnum.agent, RoleEnum.manager)),
):
    _get_owned_concert(session, concert_id, user)

    tickets = session.exec(
        select(Ticket).where(
            Ticket.concert_id == concert_id,
            Ticket.status.in_([TicketStatus.valid, TicketStatus.checked_in]),
        )
    ).all()

    category_cache: dict[int, TicketCategory | None] = {}
    referral_cache: dict[int, ReferralLink | None] = {}
    groups: dict[int | None, dict] = {}

    for ticket in tickets:
        if ticket.ticket_category_id not in category_cache:
            category_cache[ticket.ticket_category_id] = session.get(
                TicketCategory, ticket.ticket_category_id
            )
        category = category_cache[ticket.ticket_category_id]
        price = category.price_kobo if category else 0

        key = ticket.referral_link_id
        group = groups.setdefault(key, {"tickets_sold": 0, "revenue_kobo": 0})
        group["tickets_sold"] += 1
        group["revenue_kobo"] += price

    breakdown = []
    for referral_link_id, stats in groups.items():
        if referral_link_id is None:
            label = "Direct"
            commission_percent = 0.0
        else:
            if referral_link_id not in referral_cache:
                referral_cache[referral_link_id] = session.get(ReferralLink, referral_link_id)
            link = referral_cache[referral_link_id]
            commission_percent = link.commission_percent if link else 0.0
            seller = session.get(User, link.invitee_user_id) if link and link.invitee_user_id else None
            label = seller.full_name if seller else f"Referral #{referral_link_id}"

        breakdown.append(
            SellerBreakdown(
                referral_link_id=referral_link_id,
                seller_label=label,
                tickets_sold=stats["tickets_sold"],
                revenue_kobo=stats["revenue_kobo"],
                commission_kobo=int(stats["revenue_kobo"] * commission_percent / 100),
            )
        )

    return ConcertAnalyticsRead(
        concert_id=concert_id,
        total_tickets_sold=sum(g["tickets_sold"] for g in groups.values()),
        total_revenue_kobo=sum(g["revenue_kobo"] for g in groups.values()),
        breakdown=breakdown,
    )
