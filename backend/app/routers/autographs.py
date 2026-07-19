import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.database import get_session
from app.deps import get_celebrity_profile_for_user, require_role
from app.models.autograph import Autograph, AutographMedium, AutographRequest, AutographRequestStatus
from app.models.autograph_transfer import AutographTransfer
from app.models.celebrity import CelebrityProfile, VerificationStatus
from app.models.user import RoleEnum, User
from app.schemas.autograph import (
    AutographCreate,
    AutographRead,
    AutographRequestCreate,
    AutographRequestRead,
    AutographRequestUpdate,
    AutographTransferCreate,
    AutographVerificationRead,
    PhysicalAutographCreate,
)

router = APIRouter(prefix="/autographs", tags=["autographs"])


def _require_approved(profile: CelebrityProfile) -> None:
    if profile.verification_status == VerificationStatus.rejected:
        detail = "Your celebrity account verification was rejected"
        if profile.rejection_reason:
            detail += f": {profile.rejection_reason}"
        raise HTTPException(status_code=403, detail=detail)
    if profile.verification_status != VerificationStatus.approved:
        raise HTTPException(
            status_code=403,
            detail="Your celebrity account is pending verification. You'll be able to publish autographs once approved.",
        )


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
    _require_approved(profile)

    owner_user_id = None
    if payload.request_id is not None:
        request = session.get(AutographRequest, payload.request_id)
        if not request or request.celebrity_id != profile.id:
            raise HTTPException(status_code=404, detail="Request not found")
        request.status = AutographRequestStatus.fulfilled
        session.add(request)
        owner_user_id = request.fan_id

    autograph = Autograph(
        celebrity_id=profile.id,
        request_id=payload.request_id,
        content_url=payload.content_url,
        caption=payload.caption,
        owner_user_id=owner_user_id,
        verification_code=uuid.uuid4().hex[:12],
    )
    session.add(autograph)
    session.commit()
    session.refresh(autograph)

    if owner_user_id is not None:
        session.add(
            AutographTransfer(autograph_id=autograph.id, from_user_id=None, to_user_id=owner_user_id)
        )
        session.commit()

    return autograph


@router.post("/physical", response_model=AutographRead)
def log_physical_autograph(
    payload: PhysicalAutographCreate,
    session: Session = Depends(get_session),
    user: User = Depends(require_role(RoleEnum.celebrity)),
):
    profile = get_celebrity_profile_for_user(user, session)
    _require_approved(profile)

    owner_user_id = None
    if payload.recipient_email:
        recipient = session.exec(
            select(User).where(User.email == payload.recipient_email)
        ).first()
        if recipient:
            owner_user_id = recipient.id

    autograph = Autograph(
        celebrity_id=profile.id,
        content_url=payload.content_url,
        caption=payload.caption,
        medium=AutographMedium.physical,
        recipient_name=payload.recipient_name,
        owner_user_id=owner_user_id,
        verification_code=uuid.uuid4().hex[:12],
        is_publicly_visible=payload.is_publicly_visible,
    )
    session.add(autograph)
    session.commit()
    session.refresh(autograph)

    if owner_user_id is not None:
        session.add(
            AutographTransfer(autograph_id=autograph.id, from_user_id=None, to_user_id=owner_user_id)
        )
        session.commit()

    return autograph


@router.get("/issued", response_model=list[AutographRead])
def list_issued_autographs(
    session: Session = Depends(get_session),
    user: User = Depends(require_role(RoleEnum.celebrity)),
):
    profile = get_celebrity_profile_for_user(user, session)
    return session.exec(
        select(Autograph).where(Autograph.celebrity_id == profile.id)
    ).all()


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
    return session.exec(select(Autograph).where(Autograph.owner_user_id == user.id)).all()


@router.post("/{autograph_id}/transfer", response_model=AutographRead)
def transfer_autograph(
    autograph_id: int,
    payload: AutographTransferCreate,
    session: Session = Depends(get_session),
    user: User = Depends(require_role(RoleEnum.fan)),
):
    autograph = session.get(Autograph, autograph_id)
    if not autograph or autograph.owner_user_id != user.id:
        raise HTTPException(status_code=404, detail="Autograph not found")

    recipient = session.exec(select(User).where(User.email == payload.to_email)).first()
    if not recipient:
        raise HTTPException(status_code=400, detail="Recipient must have an account")
    if recipient.id == user.id:
        raise HTTPException(status_code=400, detail="Cannot transfer an autograph to yourself")

    session.add(
        AutographTransfer(
            autograph_id=autograph.id,
            from_user_id=user.id,
            to_user_id=recipient.id,
            note=payload.note,
        )
    )
    autograph.owner_user_id = recipient.id
    session.add(autograph)
    session.commit()
    session.refresh(autograph)
    return autograph


@router.get("/verify/{verification_code}", response_model=AutographVerificationRead)
def verify_autograph(verification_code: str, session: Session = Depends(get_session)):
    autograph = session.exec(
        select(Autograph).where(Autograph.verification_code == verification_code)
    ).first()
    if not autograph:
        raise HTTPException(status_code=404, detail="No autograph found for this code")

    celebrity = session.get(CelebrityProfile, autograph.celebrity_id)
    transfer_count = len(
        session.exec(
            select(AutographTransfer).where(AutographTransfer.autograph_id == autograph.id)
        ).all()
    )

    owner_name = None
    recipient_name = None
    if autograph.is_publicly_visible:
        recipient_name = autograph.recipient_name or None
        if autograph.owner_user_id:
            owner = session.get(User, autograph.owner_user_id)
            owner_name = owner.full_name if owner else None

    return AutographVerificationRead(
        verification_code=autograph.verification_code,
        celebrity_stage_name=celebrity.stage_name if celebrity else "Unknown",
        medium=autograph.medium,
        content_url=autograph.content_url,
        caption=autograph.caption,
        issued_at=autograph.issued_at,
        owner_name=owner_name,
        recipient_name=recipient_name,
        transfer_count=transfer_count,
    )
