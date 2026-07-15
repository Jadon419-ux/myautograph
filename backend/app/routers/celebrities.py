from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.database import get_session
from app.deps import get_celebrity_profile_for_user, require_role
from app.models.celebrity import CelebrityProfile
from app.models.user import RoleEnum, User
from app.schemas.celebrity import CelebrityRead, CelebrityUpdate

router = APIRouter(prefix="/celebrities", tags=["celebrities"])


def _to_read(session: Session, profile: CelebrityProfile) -> CelebrityRead:
    owner = session.get(User, profile.user_id)
    return CelebrityRead(
        id=profile.id,
        user_id=profile.user_id,
        stage_name=profile.stage_name,
        bio=profile.bio,
        category=profile.category,
        profile_image_url=profile.profile_image_url,
        avatar_url=owner.avatar_url if owner else None,
    )


@router.get("", response_model=list[CelebrityRead])
def list_celebrities(session: Session = Depends(get_session)):
    profiles = session.exec(select(CelebrityProfile)).all()
    return [_to_read(session, p) for p in profiles]


@router.get("/me", response_model=CelebrityRead)
def get_my_profile(
    session: Session = Depends(get_session),
    user: User = Depends(require_role(RoleEnum.celebrity)),
):
    profile = get_celebrity_profile_for_user(user, session)
    return _to_read(session, profile)


@router.get("/{celebrity_id}", response_model=CelebrityRead)
def get_celebrity(celebrity_id: int, session: Session = Depends(get_session)):
    profile = session.get(CelebrityProfile, celebrity_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Celebrity not found")
    return _to_read(session, profile)


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
    return _to_read(session, profile)
