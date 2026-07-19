from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.database import get_session
from app.deps import require_role
from app.models.autograph import Autograph
from app.models.celebrity import CelebrityProfile, VerificationStatus
from app.models.concert import Concert
from app.models.marketplace import MarketplaceListing, MarketplaceOrder, MarketplaceOrderStatus
from app.models.ticket_order import TicketOrder, TicketOrderStatus
from app.models.user import RoleEnum, User
from app.schemas.admin import (
    AddAdminRequest,
    AdminAnalyticsRead,
    AdminUserRead,
    CelebrityMerchRevenueBreakdown,
    ConcertRevenueBreakdown,
    RejectCelebrityRequest,
)
from app.schemas.celebrity import CelebrityModerationRead

router = APIRouter(prefix="/admin", tags=["admin"])


def _to_moderation_read(session: Session, profile: CelebrityProfile) -> CelebrityModerationRead:
    owner = session.get(User, profile.user_id)
    return CelebrityModerationRead(
        id=profile.id,
        user_id=profile.user_id,
        stage_name=profile.stage_name,
        bio=profile.bio,
        category=profile.category,
        profile_image_url=profile.profile_image_url,
        avatar_url=owner.avatar_url if owner else None,
        verification_status=profile.verification_status,
        rejection_reason=profile.rejection_reason,
        owner_email=owner.email if owner else "",
        owner_full_name=owner.full_name if owner else "",
        created_at=profile.created_at,
    )


@router.get("/celebrities", response_model=list[CelebrityModerationRead])
def list_celebrities_for_moderation(
    status: str = "pending",
    session: Session = Depends(get_session),
    user: User = Depends(require_role(RoleEnum.admin)),
):
    query = select(CelebrityProfile)
    if status != "all":
        try:
            target_status = VerificationStatus(status)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid status filter")
        query = query.where(CelebrityProfile.verification_status == target_status)

    profiles = session.exec(query.order_by(CelebrityProfile.created_at.desc())).all()
    return [_to_moderation_read(session, p) for p in profiles]


@router.post("/celebrities/{celebrity_id}/approve", response_model=CelebrityModerationRead)
def approve_celebrity(
    celebrity_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(require_role(RoleEnum.admin)),
):
    profile = session.get(CelebrityProfile, celebrity_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Celebrity not found")
    profile.verification_status = VerificationStatus.approved
    profile.rejection_reason = ""
    session.add(profile)
    session.commit()
    session.refresh(profile)
    return _to_moderation_read(session, profile)


@router.post("/celebrities/{celebrity_id}/reject", response_model=CelebrityModerationRead)
def reject_celebrity(
    celebrity_id: int,
    payload: RejectCelebrityRequest,
    session: Session = Depends(get_session),
    user: User = Depends(require_role(RoleEnum.admin)),
):
    profile = session.get(CelebrityProfile, celebrity_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Celebrity not found")
    profile.verification_status = VerificationStatus.rejected
    profile.rejection_reason = payload.reason
    session.add(profile)
    session.commit()
    session.refresh(profile)
    return _to_moderation_read(session, profile)


@router.get("/admins", response_model=list[AdminUserRead])
def list_admins(
    session: Session = Depends(get_session),
    user: User = Depends(require_role(RoleEnum.admin)),
):
    return session.exec(select(User).where(User.role == RoleEnum.admin)).all()


@router.post("/admins", response_model=AdminUserRead)
def add_admin(
    payload: AddAdminRequest,
    session: Session = Depends(get_session),
    user: User = Depends(require_role(RoleEnum.admin)),
):
    target = session.exec(select(User).where(User.email == payload.email)).first()
    if not target:
        raise HTTPException(status_code=404, detail="No account found with that email")
    target.role = RoleEnum.admin
    session.add(target)
    session.commit()
    session.refresh(target)
    return target


@router.delete("/admins/{user_id}", status_code=204)
def remove_admin(
    user_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(require_role(RoleEnum.admin)),
):
    target = session.get(User, user_id)
    if not target or target.role != RoleEnum.admin:
        raise HTTPException(status_code=404, detail="Admin not found")

    remaining_admins = session.exec(select(User).where(User.role == RoleEnum.admin)).all()
    if len(remaining_admins) <= 1:
        raise HTTPException(status_code=400, detail="Cannot remove the last remaining admin")

    target.role = RoleEnum.fan
    session.add(target)
    session.commit()


@router.get("/analytics", response_model=AdminAnalyticsRead)
def get_platform_analytics(
    session: Session = Depends(get_session),
    user: User = Depends(require_role(RoleEnum.admin)),
):
    paid_ticket_orders = session.exec(
        select(TicketOrder).where(TicketOrder.status == TicketOrderStatus.paid)
    ).all()
    paid_marketplace_orders = session.exec(
        select(MarketplaceOrder).where(MarketplaceOrder.status == MarketplaceOrderStatus.paid)
    ).all()

    concert_groups: dict[int, dict] = {}
    for order in paid_ticket_orders:
        group = concert_groups.setdefault(order.concert_id, {"tickets_sold": 0, "revenue_kobo": 0})
        group["tickets_sold"] += order.quantity
        group["revenue_kobo"] += order.amount_kobo

    concert_breakdown = []
    for concert_id, stats in concert_groups.items():
        concert = session.get(Concert, concert_id)
        concert_breakdown.append(
            ConcertRevenueBreakdown(
                concert_id=concert_id,
                title=concert.title if concert else f"Concert #{concert_id}",
                tickets_sold=stats["tickets_sold"],
                revenue_kobo=stats["revenue_kobo"],
            )
        )

    celebrity_groups: dict[int, dict] = {}
    for order in paid_marketplace_orders:
        listing = session.get(MarketplaceListing, order.listing_id)
        if not listing:
            continue
        autograph = session.get(Autograph, listing.autograph_id)
        if not autograph:
            continue
        group = celebrity_groups.setdefault(
            autograph.celebrity_id, {"items_sold": 0, "revenue_kobo": 0}
        )
        group["items_sold"] += 1
        group["revenue_kobo"] += order.amount_kobo

    marketplace_breakdown = []
    for celebrity_id, stats in celebrity_groups.items():
        celebrity = session.get(CelebrityProfile, celebrity_id)
        marketplace_breakdown.append(
            CelebrityMerchRevenueBreakdown(
                celebrity_id=celebrity_id,
                stage_name=celebrity.stage_name if celebrity else f"Celebrity #{celebrity_id}",
                items_sold=stats["items_sold"],
                revenue_kobo=stats["revenue_kobo"],
            )
        )

    return AdminAnalyticsRead(
        total_ticket_revenue_kobo=sum(o.amount_kobo for o in paid_ticket_orders),
        total_ticket_orders=len(paid_ticket_orders),
        total_marketplace_revenue_kobo=sum(o.amount_kobo for o in paid_marketplace_orders),
        total_marketplace_orders=len(paid_marketplace_orders),
        concert_breakdown=concert_breakdown,
        marketplace_breakdown=marketplace_breakdown,
    )
