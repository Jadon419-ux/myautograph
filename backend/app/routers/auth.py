from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select

from app.database import get_session
from app.deps import get_current_user
from app.models.celebrity import CelebrityProfile
from app.models.user import User, RoleEnum
from app.schemas.auth import Token, UserCreate, UserRead
from app.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserRead)
def register(payload: UserCreate, session: Session = Depends(get_session)):
    existing = session.exec(select(User).where(User.email == payload.email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    if payload.role == RoleEnum.celebrity and not payload.stage_name:
        raise HTTPException(status_code=400, detail="stage_name is required for celebrity accounts")

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
