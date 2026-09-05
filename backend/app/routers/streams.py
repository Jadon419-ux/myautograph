import uuid

import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.database import get_session
from app.deps import get_celebrity_profile_for_user, get_current_user, get_current_user_optional, require_role
from app.models.celebrity import CelebrityProfile
from app.models.concert import Concert, ConcertCelebrityLink
from app.models.roster import ManagerRoster
from app.models.stream import Stream
from app.models.stream_order import StreamAccessOrder
from app.models.user import RoleEnum, User
from app.schemas.stream import StreamAccessOrderRead, StreamCreate, StreamRead
from app.services.paystack import initialize_transaction
from app.services.streams import user_has_stream_access

router = APIRouter(prefix="/streams", tags=["streams"])


def _to_read(session: Session, stream: Stream, user: User | None) -> StreamRead:
    has_access = user_has_stream_access(session, stream, user)
    return StreamRead(
        id=stream.id,
        celebrity_id=stream.celebrity_id,
        concert_id=stream.concert_id,
        title=stream.title,
        scheduled_at=stream.scheduled_at,
        is_live=stream.is_live,
        price_kobo=stream.price_kobo,
        has_access=has_access,
        embed_url=stream.embed_url if has_access else None,
    )


@router.get("/upcoming", response_model=list[StreamRead])
def list_upcoming(
    session: Session = Depends(get_session),
    user: User | None = Depends(get_current_user_optional),
):
    streams = session.exec(select(Stream)).all()
    return [_to_read(session, s, user) for s in streams]


@router.get("/celebrity/{celebrity_id}", response_model=list[StreamRead])
def list_for_celebrity(
    celebrity_id: int,
    session: Session = Depends(get_session),
    user: User | None = Depends(get_current_user_optional),
):
    streams = session.exec(select(Stream).where(Stream.celebrity_id == celebrity_id)).all()
    return [_to_read(session, s, user) for s in streams]


@router.get("/concert/{concert_id}", response_model=list[StreamRead])
def list_for_concert(
    concert_id: int,
    session: Session = Depends(get_session),
    user: User | None = Depends(get_current_user_optional),
):
    streams = session.exec(select(Stream).where(Stream.concert_id == concert_id)).all()
    return [_to_read(session, s, user) for s in streams]


@router.get("/{stream_id}", response_model=StreamRead)
def get_stream(
    stream_id: int,
    session: Session = Depends(get_session),
    user: User | None = Depends(get_current_user_optional),
):
    stream = session.get(Stream, stream_id)
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")
    return _to_read(session, stream, user)


def _resolve_celebrity_for_creation(
    session: Session, user: User, payload: StreamCreate
) -> CelebrityProfile:
    if user.role == RoleEnum.celebrity:
        return get_celebrity_profile_for_user(user, session)

    # Manager: must name which star in their roster this livestream is for.
    if not payload.celebrity_id:
        raise HTTPException(status_code=400, detail="celebrity_id is required when a manager creates a stream")
    in_roster = session.exec(
        select(ManagerRoster).where(
            ManagerRoster.manager_id == user.id, ManagerRoster.celebrity_id == payload.celebrity_id
        )
    ).first()
    if not in_roster:
        raise HTTPException(status_code=404, detail="Celebrity not found in your roster")
    profile = session.get(CelebrityProfile, payload.celebrity_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Celebrity not found")
    return profile


@router.post("", response_model=StreamRead)
def schedule_stream(
    payload: StreamCreate,
    session: Session = Depends(get_session),
    user: User = Depends(require_role(RoleEnum.celebrity, RoleEnum.manager)),
):
    profile = _resolve_celebrity_for_creation(session, user, payload)

    if payload.concert_id is not None:
        concert = session.get(Concert, payload.concert_id)
        if not concert:
            raise HTTPException(status_code=404, detail="Event not found")
        if user.role == RoleEnum.manager and concert.agent_id != user.id:
            raise HTTPException(status_code=404, detail="Event not found")
        linked = session.get(ConcertCelebrityLink, (payload.concert_id, profile.id))
        if not linked:
            raise HTTPException(status_code=400, detail="This star is not tagged in that event")

    if payload.price_kobo < 0:
        raise HTTPException(status_code=400, detail="Price cannot be negative")

    stream = Stream(
        celebrity_id=profile.id,
        concert_id=payload.concert_id,
        title=payload.title,
        embed_url=payload.embed_url,
        scheduled_at=payload.scheduled_at,
        price_kobo=payload.price_kobo,
    )
    session.add(stream)
    session.commit()
    session.refresh(stream)
    return _to_read(session, stream, user)


@router.patch("/{stream_id}/go-live", response_model=StreamRead)
def toggle_go_live(
    stream_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(require_role(RoleEnum.celebrity, RoleEnum.manager)),
):
    stream = session.get(Stream, stream_id)
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")

    if user.role == RoleEnum.celebrity:
        profile = get_celebrity_profile_for_user(user, session)
        if stream.celebrity_id != profile.id:
            raise HTTPException(status_code=404, detail="Stream not found")
    else:
        in_roster = session.exec(
            select(ManagerRoster).where(
                ManagerRoster.manager_id == user.id, ManagerRoster.celebrity_id == stream.celebrity_id
            )
        ).first()
        if not in_roster:
            raise HTTPException(status_code=404, detail="Stream not found")

    stream.is_live = not stream.is_live
    session.add(stream)
    session.commit()
    session.refresh(stream)
    return _to_read(session, stream, user)


@router.post("/{stream_id}/purchase", response_model=StreamAccessOrderRead)
def purchase_stream_access(
    stream_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    stream = session.get(Stream, stream_id)
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")
    if stream.price_kobo <= 0:
        raise HTTPException(status_code=400, detail="This livestream is free")
    if user_has_stream_access(session, stream, user):
        raise HTTPException(status_code=400, detail="You already have access to this livestream")

    order = StreamAccessOrder(
        stream_id=stream.id,
        buyer_user_id=user.id,
        amount_kobo=stream.price_kobo,
        paystack_reference=uuid.uuid4().hex,
    )
    session.add(order)
    session.commit()
    session.refresh(order)

    try:
        data = initialize_transaction(user.email, order.amount_kobo, order.paystack_reference)
        authorization_url = data.get("authorization_url")
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="Could not initialize payment. Please try again.")

    return StreamAccessOrderRead(**order.model_dump(), authorization_url=authorization_url)
