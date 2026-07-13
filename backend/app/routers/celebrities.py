from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.database import get_session
from app.deps import get_celebrity_profile_for_user, require_role
from app.models.celebrity import CelebrityProfile
from app.models.user import RoleEnum, User
from app.schemas.celebrity import CelebrityRead, CelebrityUpdate

router = APIRouter(prefix="/celebrities", tags=["celebrities"])


@router.get("", response_model=list[CelebrityRead])
def list_celebrities(session: Session = Depends(get_session)):
    return session.exec(select(CelebrityProfile)).all()


@router.get("/me", response_model=CelebrityRead)
def get_my_profile(
    session: Session = Depends(get_session),
    user: User = Depends(require_role(RoleEnum.celebrity)),
):
    return get_celebrity_profile_for_user(user, session)


@router.get("/{celebrity_id}", response_model=CelebrityRead)
def get_celebrity(celebrity_id: int, session: Session = Depends(get_session)):
    profile = session.get(CelebrityProfile, celebrity_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Celebrity not found")
    return profile


@router.patch("/me", response_model=CelebrityRead)
def update_my_profile(
    payload: CelebrityUpdate,
    session: Session = Depends(get_session),
    user: User = Depends(require_role(RoleEnum.celebrity)),
):
    profile = get_celebrity_profile_for_user(user, session)

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(profile, key, value)

    session.add(profile)
    session.commit()
    session.refresh(profile)
    return profile
