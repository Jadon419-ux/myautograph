import uuid

import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.database import get_session
from app.deps import get_celebrity_profile_for_user, get_current_user, require_role
from app.models.celebrity import CelebrityProfile, VerificationStatus
from app.models.merchandise import CelebrityMerchandise, MerchandiseOrder, MerchandiseOrderStatus
from app.models.user import RoleEnum, User
from app.schemas.merchandise import (
    MerchandiseCreate,
    MerchandiseOrderCreate,
    MerchandiseOrderRead,
    MerchandiseRead,
    MerchandiseSaleRead,
    MerchandiseUpdate,
)
from app.services.merchandise import (
    order_to_read,
    release_merchandise_reservation,
    verify_and_finalize_merchandise_order,
)
from app.services.paystack import initialize_transaction

router = APIRouter(prefix="/merchandise", tags=["merchandise"])


def _require_approved(profile: CelebrityProfile) -> None:
    if profile.verification_status == VerificationStatus.rejected:
        detail = "Your celebrity account verification was rejected"
        if profile.rejection_reason:
            detail += f": {profile.rejection_reason}"
        raise HTTPException(status_code=403, detail=detail)
    if profile.verification_status != VerificationStatus.approved:
        raise HTTPException(
            status_code=403,
            detail="Your celebrity account is pending verification. You'll be able to sell merchandise once approved.",
        )


def _to_read(session: Session, merch: CelebrityMerchandise) -> MerchandiseRead:
    celebrity = session.get(CelebrityProfile, merch.celebrity_id)
    return MerchandiseRead(
        id=merch.id,
        celebrity_id=merch.celebrity_id,
        celebrity_stage_name=celebrity.stage_name if celebrity else "",
        title=merch.title,
        description=merch.description,
        image_url=merch.image_url,
        price_kobo=merch.price_kobo,
        quantity_total=merch.quantity_total,
        quantity_sold=merch.quantity_sold,
        quantity_available=merch.quantity_total - merch.quantity_reserved - merch.quantity_sold,
        is_active=merch.is_active,
        created_at=merch.created_at,
    )


def _get_owned_merch(session: Session, merch_id: int, profile: CelebrityProfile) -> CelebrityMerchandise:
    merch = session.get(CelebrityMerchandise, merch_id)
    if not merch or merch.celebrity_id != profile.id:
        raise HTTPException(status_code=404, detail="Merchandise item not found")
    return merch


@router.post("", response_model=MerchandiseRead)
def create_merchandise(
    payload: MerchandiseCreate,
    session: Session = Depends(get_session),
    user: User = Depends(require_role(RoleEnum.celebrity)),
):
    profile = get_celebrity_profile_for_user(user, session)
    _require_approved(profile)

    if payload.quantity_total < 1:
        raise HTTPException(status_code=400, detail="Quantity must be at least 1")

    merch = CelebrityMerchandise(
        celebrity_id=profile.id,
        title=payload.title,
        description=payload.description,
        image_url=payload.image_url,
        price_kobo=payload.price_kobo,
        quantity_total=payload.quantity_total,
    )
    session.add(merch)
    session.commit()
    session.refresh(merch)
    return _to_read(session, merch)


@router.get("", response_model=list[MerchandiseRead])
def list_merchandise(session: Session = Depends(get_session)):
    items = session.exec(
        select(CelebrityMerchandise).where(CelebrityMerchandise.is_active.is_(True))
    ).all()
    return [_to_read(session, m) for m in items]


@router.get("/mine", response_model=list[MerchandiseRead])
def list_my_merchandise(
    session: Session = Depends(get_session),
    user: User = Depends(require_role(RoleEnum.celebrity)),
):
    profile = get_celebrity_profile_for_user(user, session)
    items = session.exec(
        select(CelebrityMerchandise).where(CelebrityMerchandise.celebrity_id == profile.id)
    ).all()
    return [_to_read(session, m) for m in items]


@router.get("/mine/orders", response_model=list[MerchandiseOrderRead])
def list_my_merch_orders(
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    orders = session.exec(
        select(MerchandiseOrder).where(MerchandiseOrder.buyer_user_id == user.id)
    ).all()
    return [order_to_read(session, o) for o in orders]


@router.get("/mine/sales", response_model=list[MerchandiseSaleRead])
def list_my_merch_sales(
    session: Session = Depends(get_session),
    user: User = Depends(require_role(RoleEnum.celebrity)),
):
    profile = get_celebrity_profile_for_user(user, session)
    merch_ids = {
        m.id
        for m in session.exec(
            select(CelebrityMerchandise).where(CelebrityMerchandise.celebrity_id == profile.id)
        ).all()
    }
    if not merch_ids:
        return []

    orders = session.exec(
        select(MerchandiseOrder).where(
            MerchandiseOrder.merchandise_id.in_(merch_ids),
            MerchandiseOrder.status == MerchandiseOrderStatus.paid,
        )
    ).all()

    result = []
    for order in orders:
        merch = session.get(CelebrityMerchandise, order.merchandise_id)
        buyer = session.get(User, order.buyer_user_id)
        result.append(
            MerchandiseSaleRead(
                order_id=order.id,
                merchandise_id=order.merchandise_id,
                merchandise_title=merch.title if merch else "",
                buyer_name=buyer.full_name if buyer else "Unknown",
                buyer_email=buyer.email if buyer else "",
                quantity=order.quantity,
                amount_kobo=order.amount_kobo,
                created_at=order.created_at,
            )
        )
    return result


@router.get("/{merch_id}", response_model=MerchandiseRead)
def get_merchandise(merch_id: int, session: Session = Depends(get_session)):
    merch = session.get(CelebrityMerchandise, merch_id)
    if not merch:
        raise HTTPException(status_code=404, detail="Merchandise item not found")
    return _to_read(session, merch)


@router.patch("/{merch_id}", response_model=MerchandiseRead)
def update_merchandise(
    merch_id: int,
    payload: MerchandiseUpdate,
    session: Session = Depends(get_session),
    user: User = Depends(require_role(RoleEnum.celebrity)),
):
    profile = get_celebrity_profile_for_user(user, session)
    merch = _get_owned_merch(session, merch_id, profile)

    data = payload.model_dump(exclude_unset=True)
    if "quantity_total" in data and data["quantity_total"] < merch.quantity_reserved + merch.quantity_sold:
        raise HTTPException(
            status_code=400,
            detail="Quantity can't be lower than what's already reserved or sold",
        )
    for field, value in data.items():
        setattr(merch, field, value)

    session.add(merch)
    session.commit()
    session.refresh(merch)
    return _to_read(session, merch)


@router.post("/{merch_id}/buy", response_model=MerchandiseOrderRead)
def buy_merchandise(
    merch_id: int,
    payload: MerchandiseOrderCreate,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    merch = session.get(CelebrityMerchandise, merch_id)
    if not merch or not merch.is_active:
        raise HTTPException(status_code=404, detail="Merchandise item not found")

    if payload.quantity < 1:
        raise HTTPException(status_code=400, detail="Quantity must be at least 1")

    available = merch.quantity_total - merch.quantity_reserved - merch.quantity_sold
    if payload.quantity > available:
        raise HTTPException(status_code=400, detail="Not enough stock available")

    merch.quantity_reserved += payload.quantity
    session.add(merch)

    order = MerchandiseOrder(
        merchandise_id=merch.id,
        buyer_user_id=user.id,
        quantity=payload.quantity,
        amount_kobo=merch.price_kobo * payload.quantity,
        paystack_reference=uuid.uuid4().hex,
    )
    session.add(order)
    session.commit()
    session.refresh(order)

    try:
        data = initialize_transaction(user.email, order.amount_kobo, order.paystack_reference)
        authorization_url = data.get("authorization_url")
    except HTTPException:
        release_merchandise_reservation(session, merch, payload.quantity)
        raise
    except httpx.HTTPError:
        release_merchandise_reservation(session, merch, payload.quantity)
        raise HTTPException(status_code=502, detail="Could not initialize payment. Please try again.")

    return order_to_read(session, order, authorization_url=authorization_url)
