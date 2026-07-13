from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.database import get_session
from app.deps import get_celebrity_profile_for_user, require_role
from app.models.stream import Stream
from app.models.user import RoleEnum, User
from app.schemas.stream import StreamCreate, StreamRead

router = APIRouter(prefix="/streams", tags=["streams"])


@router.get("/upcoming", response_model=list[StreamRead])
def list_upcoming(session: Session = Depends(get_session)):
    return session.exec(select(Stream)).all()


@router.get("/celebrity/{celebrity_id}", response_model=list[StreamRead])
def list_for_celebrity(celebrity_id: int, session: Session = Depends(get_session)):
    return session.exec(
        select(Stream).where(Stream.celebrity_id == celebrity_id)
    ).all()


@router.post("", response_model=StreamRead)
def schedule_stream(
    payload: StreamCreate,
    session: Session = Depends(get_session),
    user: User = Depends(require_role(RoleEnum.celebrity)),
):
    profile = get_celebrity_profile_for_user(user, session)
    stream = Stream(celebrity_id=profile.id, **payload.model_dump())
    session.add(stream)
    session.commit()
    session.refresh(stream)
    return stream


@router.patch("/{stream_id}/go-live", response_model=StreamRead)
def toggle_go_live(
    stream_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(require_role(RoleEnum.celebrity)),
):
    profile = get_celebrity_profile_for_user(user, session)
    stream = session.get(Stream, stream_id)
    if not stream or stream.celebrity_id != profile.id:
        raise HTTPException(status_code=404, detail="Stream not found")

    stream.is_live = not stream.is_live
    session.add(stream)
    session.commit()
    session.refresh(stream)
    return stream
