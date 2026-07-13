from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.database import get_session
from app.deps import require_role
from app.models.celebrity import CelebrityProfile
from app.models.concert import Concert, ConcertCelebrityLink
from app.models.user import RoleEnum, User
from app.schemas.concert import ConcertCreate, ConcertRead

router = APIRouter(prefix="/concerts", tags=["concerts"])


def _to_read(session: Session, concert: Concert) -> ConcertRead:
    links = session.exec(
        select(ConcertCelebrityLink).where(ConcertCelebrityLink.concert_id == concert.id)
    ).all()
    celebrities = [session.get(CelebrityProfile, link.celebrity_id) for link in links]
    return ConcertRead(
        id=concert.id,
        agent_id=concert.agent_id,
        title=concert.title,
        venue=concert.venue,
        event_date=concert.event_date,
        description=concert.description,
        celebrities=[c for c in celebrities if c is not None],
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
    user: User = Depends(require_role(RoleEnum.agent)),
):
    concert = Concert(agent_id=user.id, **payload.model_dump())
    session.add(concert)
    session.commit()
    session.refresh(concert)
    return _to_read(session, concert)


@router.patch("/{concert_id}", response_model=ConcertRead)
def update_concert(
    concert_id: int,
    payload: ConcertCreate,
    session: Session = Depends(get_session),
    user: User = Depends(require_role(RoleEnum.agent)),
):
    concert = session.get(Concert, concert_id)
    if not concert or concert.agent_id != user.id:
        raise HTTPException(status_code=404, detail="Concert not found")

    for key, value in payload.model_dump().items():
        setattr(concert, key, value)
    session.add(concert)
    session.commit()
    session.refresh(concert)
    return _to_read(session, concert)


@router.delete("/{concert_id}", status_code=204)
def delete_concert(
    concert_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(require_role(RoleEnum.agent)),
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
    user: User = Depends(require_role(RoleEnum.agent)),
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
