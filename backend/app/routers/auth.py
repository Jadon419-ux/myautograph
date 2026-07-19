from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select

from app.database import get_session
from app.deps import get_current_user
from app.models.celebrity import CelebrityProfile
from app.models.referral import ReferralLink, ReferralLinkStatus
from app.models.user import User, RoleEnum
from app.schemas.auth import AvatarUpdate, Token, UserCreate, UserRead
from app.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserRead)
def register(payload: UserCreate, session: Session = Depends(get_session)):
    existing = session.exec(select(User).where(User.email == payload.email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    if payload.role == RoleEnum.celebrity and not payload.stage_name:
        raise HTTPException(status_code=400, detail="stage_name is required for celebrity accounts")

    if payload.role == RoleEnum.admin:
        raise HTTPException(status_code=400, detail="Admin accounts cannot be self-registered")

    referral_link = None
    if payload.role == RoleEnum.sales_agent:
        referral_link = session.exec(
            select(ReferralLink).where(
                ReferralLink.code == payload.referral_code,
                ReferralLink.invitee_role == RoleEnum.sales_agent,
                ReferralLink.invitee_user_id.is_(None),
            )
        ).first()
        if not referral_link:
            raise HTTPException(
                status_code=400,
                detail="A valid invite link is required to register as a sales agent",
            )

    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        role=payload.role,
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    if user.role == RoleEnum.celebrity:
        profile = CelebrityProfile(
            user_id=user.id,
            stage_name=payload.stage_name,
            category=payload.category or "",
        )
        session.add(profile)
        session.commit()

    if referral_link is not None:
        referral_link.invitee_user_id = user.id
        referral_link.status = ReferralLinkStatus.accepted
        referral_link.accepted_at = datetime.utcnow()
        session.add(referral_link)
        session.commit()

    return user


@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: Session = Depends(get_session),
):
    user = session.exec(select(User).where(User.email == form_data.username)).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    token = create_access_token(subject=user.email)
    return Token(access_token=token)


@router.get("/me", response_model=UserRead)
def me(user: User = Depends(get_current_user)):
    return user


@router.patch("/me/avatar", response_model=UserRead)
def update_avatar(
    payload: AvatarUpdate,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    user.avatar_url = payload.avatar_url
    session.add(user)
    session.commit()
    session.refresh(user)
    return user
