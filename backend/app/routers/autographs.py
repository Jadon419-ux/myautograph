from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.database import get_session
from app.deps import get_celebrity_profile_for_user, require_role
from app.models.autograph import Autograph, AutographRequest, AutographRequestStatus
from app.models.user import RoleEnum, User
from app.schemas.autograph import (
    AutographCreate,
    AutographRead,
    AutographRequestCreate,
    AutographRequestRead,
    AutographRequestUpdate,
)

router = APIRouter(prefix="/autographs", tags=["autographs"])


@router.post("/requests", response_model=AutographRequestRead)
def create_request(
    payload: AutographRequestCreate,
    session: Session = Depends(get_session),
    user: User = Depends(require_role(RoleEnum.fan)),
):
    request = AutographRequest(
        fan_id=user.id,
        celebrity_id=payload.celebrity_id,
        message=payload.message,
    )
    session.add(request)
    session.commit()
    session.refresh(request)
    return request


@router.get("/requests/mine", response_model=list[AutographRequestRead])
def list_my_requests(
    session: Session = Depends(get_session),
    user: User = Depends(require_role(RoleEnum.fan)),
):
    return session.exec(
        select(AutographRequest).where(AutographRequest.fan_id == user.id)
    ).all()


@router.get("/requests/incoming", response_model=list[AutographRequestRead])
def list_incoming_requests(
    session: Session = Depends(get_session),
    user: User = Depends(require_role(RoleEnum.celebrity)),
):
    profile = get_celebrity_profile_for_user(user, session)
    return session.exec(
        select(AutographRequest).where(AutographRequest.celebrity_id == profile.id)
    ).all()


@router.patch("/requests/{request_id}", response_model=AutographRequestRead)
def update_request_status(
    request_id: int,
    payload: AutographRequestUpdate,
    session: Session = Depends(get_session),
    user: User = Depends(require_role(RoleEnum.celebrity)),
):
    profile = get_celebrity_profile_for_user(user, session)
    request = session.get(AutographRequest, request_id)
    if not request or request.celebrity_id != profile.id:
        raise HTTPException(status_code=404, detail="Request not found")

    request.status = payload.status
    session.add(request)
    session.commit()
    session.refresh(request)
    return request


@router.post("", response_model=AutographRead)
def publish_autograph(
    payload: AutographCreate,
    session: Session = Depends(get_session),
    user: User = Depends(require_role(RoleEnum.celebrity)),
):
    profile = get_celebrity_profile_for_user(user, session)

    if payload.request_id is not None:
        request = session.get(AutographRequest, payload.request_id)
        if not request or request.celebrity_id != profile.id:
            raise HTTPException(status_code=404, detail="Request not found")
        request.status = AutographRequestStatus.fulfilled
        session.add(request)

    autograph = Autograph(
        celebrity_id=profile.id,
        request_id=payload.request_id,
        content_url=payload.content_url,
        caption=payload.caption,
    )
    session.add(autograph)
    session.commit()
    session.refresh(autograph)
    return autograph


@router.get("/celebrity/{celebrity_id}", response_model=list[AutographRead])
def list_celebrity_autographs(celebrity_id: int, session: Session = Depends(get_session)):
    return session.exec(
        select(Autograph).where(Autograph.celebrity_id == celebrity_id)
    ).all()


@router.get("/mine", response_model=list[AutographRead])
def list_my_autographs(
    session: Session = Depends(get_session),
    user: User = Depends(require_role(RoleEnum.fan)),
):
    my_request_ids = [
        r.id
        for r in session.exec(
            select(AutographRequest).where(AutographRequest.fan_id == user.id)
        ).all()
    ]
    if not my_request_ids:
        return []
    return session.exec(
        select(Autograph).where(Autograph.request_id.in_(my_request_ids))
    ).all()
