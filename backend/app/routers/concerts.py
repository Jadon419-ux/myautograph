from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.database import get_session
from app.deps import require_role
from app.models.celebrity import CelebrityProfile
from app.models.concert import Concert, ConcertCelebrityLink
from app.models.roster import ManagerRoster
from app.models.user import RoleEnum, User
from app.routers.celebrities import _to_read as _celebrity_to_read
from app.schemas.concert import ConcertCreate, ConcertRead
from app.services.paystack import PLATFORM_TICKET_FEE_PERCENT

router = APIRouter(prefix="/concerts", tags=["concerts"])

MAX_AGENT_COMMISSION_PERCENT = 100 - PLATFORM_TICKET_FEE_PERCENT


def _validate_agent_commission_percent(percent: float) -> None:
    if not (0 <= percent <= MAX_AGENT_COMMISSION_PERCENT):
        raise HTTPException(
            status_code=400,
            detail=f"Agent commission must be between 0 and {MAX_AGENT_COMMISSION_PERCENT:g}% "
            f"(the platform keeps a fixed {PLATFORM_TICKET_FEE_PERCENT:g}%)",
        )


def _to_read(session: Session, concert: Concert) -> ConcertRead:
    links = session.exec(
        select(ConcertCelebrityLink).where(ConcertCelebrityLink.concert_id == concert.id)
    ).all()
    profiles = [session.get(CelebrityProfile, link.celebrity_id) for link in links]
    return ConcertRead(
        id=concert.id,
        agent_id=concert.agent_id,
        title=concert.title,
        venue=concert.venue,
        event_date=concert.event_date,
        description=concert.description,
        agent_commission_percent=concert.agent_commission_percent,
        celebrities=[_celebrity_to_read(session, p) for p in profiles if p is not None],
    )


@router.get("", response_model=list[ConcertRead])
def list_concerts(session: Session = Depends(get_session)):
    concerts = session.exec(select(Concert)).all()
    return [_to_read(session, c) for c in concerts]


@router.get("/{concert_id}", response_model=ConcertRead)
def get_concert(concert_id: int, session: Session = Depends(get_session)):
    concert = session.get(Concert, concert_id)
    if not concert:
        raise HTTPException(status_code=404, detail="Concert not found")
    return _to_read(session, concert)


@router.post("", response_model=ConcertRead)
def create_concert(
    payload: ConcertCreate,
    session: Session = Depends(get_session),
    user: User = Depends(require_role(RoleEnum.agent, RoleEnum.manager)),
):
    celebrity_id = payload.celebrity_id

    if user.role == RoleEnum.manager:
        if not celebrity_id:
            raise HTTPException(status_code=400, detail="Select a celebrity (star) for this ticket")
        in_roster = session.exec(
            select(ManagerRoster).where(
                ManagerRoster.manager_id == user.id, ManagerRoster.celebrity_id == celebrity_id
            )
        ).first()
        if not in_roster:
            raise HTTPException(status_code=404, detail="Celebrity not found in your roster")
    elif celebrity_id is not None and not session.get(CelebrityProfile, celebrity_id):
        raise HTTPException(status_code=404, detail="Celebrity not found")

    _validate_agent_commission_percent(payload.agent_commission_percent)

    concert_data = payload.model_dump(exclude={"celebrity_id"})
    concert = Concert(agent_id=user.id, **concert_data)
    session.add(concert)
    session.commit()
    session.refresh(concert)

    if celebrity_id is not None:
        session.add(ConcertCelebrityLink(concert_id=concert.id, celebrity_id=celebrity_id))
        session.commit()

    return _to_read(session, concert)


@router.patch("/{concert_id}", response_model=ConcertRead)
def update_concert(
    concert_id: int,
    payload: ConcertCreate,
    session: Session = Depends(get_session),
    user: User = Depends(require_role(RoleEnum.agent, RoleEnum.manager)),
):
    concert = session.get(Concert, concert_id)
    if not concert or concert.agent_id != user.id:
        raise HTTPException(status_code=404, detail="Concert not found")

    _validate_agent_commission_percent(payload.agent_commission_percent)

    for key, value in payload.model_dump(exclude={"celebrity_id"}).items():
        setattr(concert, key, value)
    session.add(concert)
    session.commit()
    session.refresh(concert)
    return _to_read(session, concert)


@router.delete("/{concert_id}", status_code=204)
def delete_concert(
    concert_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(require_role(RoleEnum.agent, RoleEnum.manager)),
):
    concert = session.get(Concert, concert_id)
    if not concert or concert.agent_id != user.id:
        raise HTTPException(status_code=404, detail="Concert not found")
    session.delete(concert)
    session.commit()


@router.post("/{concert_id}/celebrities/{celebrity_id}", response_model=ConcertRead)
def link_celebrity(
    concert_id: int,
    celebrity_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(require_role(RoleEnum.agent, RoleEnum.manager)),
):
    concert = session.get(Concert, concert_id)
    if not concert or concert.agent_id != user.id:
        raise HTTPException(status_code=404, detail="Concert not found")
    if not session.get(CelebrityProfile, celebrity_id):
        raise HTTPException(status_code=404, detail="Celebrity not found")

    existing = session.get(ConcertCelebrityLink, (concert_id, celebrity_id))
    if not existing:
        session.add(ConcertCelebrityLink(concert_id=concert_id, celebrity_id=celebrity_id))
        session.commit()

    return _to_read(session, concert)
