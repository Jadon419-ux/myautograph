from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.database import get_session
from app.deps import require_role
from app.models.celebrity import CelebrityProfile
from app.models.roster import ManagerRoster
from app.models.user import RoleEnum, User
from app.routers.celebrities import _to_read
from app.schemas.celebrity import CelebrityRead
from app.schemas.manager import CelebrityOnboardCreate
from app.security import hash_password

router = APIRouter(prefix="/managers", tags=["managers"])


@router.get("/roster", response_model=list[CelebrityRead])
def list_roster(
    session: Session = Depends(get_session),
    user: User = Depends(require_role(RoleEnum.manager)),
):
    links = session.exec(
        select(ManagerRoster).where(ManagerRoster.manager_id == user.id)
    ).all()
    celebrities = [session.get(CelebrityProfile, link.celebrity_id) for link in links]
    return [_to_read(session, c) for c in celebrities if c is not None]


@router.post("/roster", response_model=CelebrityRead)
def onboard_celebrity(
    payload: CelebrityOnboardCreate,
    session: Session = Depends(get_session),
    user: User = Depends(require_role(RoleEnum.manager)),
):
    existing = session.exec(select(User).where(User.email == payload.email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    celebrity_user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        role=RoleEnum.celebrity,
    )
    session.add(celebrity_user)
    session.commit()
    session.refresh(celebrity_user)

    profile = CelebrityProfile(
        user_id=celebrity_user.id,
        stage_name=payload.stage_name,
        category=payload.category,
    )
    session.add(profile)
    session.commit()
    session.refresh(profile)

    session.add(ManagerRoster(manager_id=user.id, celebrity_id=profile.id))
    session.commit()

    return _to_read(session, profile)
