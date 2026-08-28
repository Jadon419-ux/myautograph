import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select

from app.database import get_session
from app.deps import get_current_user
from app.models.celebrity import CelebrityProfile
from app.models.referral import ReferralLink, ReferralLinkStatus
from app.models.user import User, RoleEnum
from app.schemas.auth import (
    AvatarUpdate,
    ForgotPasswordRequest,
    ProfileUpdate,
    ResetPasswordRequest,
    Token,
    UserCreate,
    UserRead,
    VerifyEmailRequest,
)
from app.security import create_access_token, hash_password, verify_password
from app.services.email import send_password_reset_email, send_verification_email

router = APIRouter(prefix="/auth", tags=["auth"])

CODE_TTL_MINUTES = 15


def _generate_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def _issue_verification_code(user: User) -> str:
    code = _generate_code()
    user.email_verification_code = code
    user.email_verification_expires_at = datetime.utcnow() + timedelta(minutes=CODE_TTL_MINUTES)
    return code


@router.post("/register", response_model=UserRead)
def register(payload: UserCreate, session: Session = Depends(get_session)):
    existing = session.exec(select(User).where(User.email == payload.email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    if payload.role == RoleEnum.celebrity and not payload.stage_name:
        raise HTTPException(status_code=400, detail="stage_name is required for celebrity accounts")

    if not payload.phone_number or not payload.phone_number.strip():
        raise HTTPException(status_code=400, detail="Phone number is required")

    phone_number = payload.phone_number.strip()
    existing_phone = session.exec(select(User).where(User.phone_number == phone_number)).first()
    if existing_phone:
        raise HTTPException(status_code=400, detail="This phone number is already registered")

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
        phone_number=phone_number,
        role=payload.role,
    )
    code = _issue_verification_code(user)
    session.add(user)
    session.commit()
    session.refresh(user)
    send_verification_email(user.email, code)

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


@router.patch("/me", response_model=UserRead)
def update_profile(
    payload: ProfileUpdate,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    if not payload.full_name or not payload.full_name.strip():
        raise HTTPException(status_code=400, detail="Full name is required")
    user.full_name = payload.full_name.strip()
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@router.post("/verify-email", response_model=UserRead)
def verify_email(
    payload: VerifyEmailRequest,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    if user.is_email_verified:
        return user

    if not user.email_verification_code or user.email_verification_code != payload.code:
        raise HTTPException(status_code=400, detail="Invalid verification code")
    if not user.email_verification_expires_at or datetime.utcnow() > user.email_verification_expires_at:
        raise HTTPException(status_code=400, detail="This code has expired. Request a new one.")

    user.is_email_verified = True
    user.email_verification_code = None
    user.email_verification_expires_at = None
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@router.post("/resend-verification")
def resend_verification(
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    if user.is_email_verified:
        raise HTTPException(status_code=400, detail="This email is already verified")

    code = _issue_verification_code(user)
    session.add(user)
    session.commit()
    send_verification_email(user.email, code)
    return {"status": "sent"}


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.email == payload.email)).first()
    if user:
        code = _generate_code()
        user.password_reset_code = code
        user.password_reset_expires_at = datetime.utcnow() + timedelta(minutes=CODE_TTL_MINUTES)
        session.add(user)
        session.commit()
        send_password_reset_email(user.email, code)

    # Always the same response, whether or not the email exists — avoids leaking
    # which addresses are registered.
    return {"status": "sent"}


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.email == payload.email)).first()
    if (
        not user
        or not user.password_reset_code
        or user.password_reset_code != payload.code
        or not user.password_reset_expires_at
        or datetime.utcnow() > user.password_reset_expires_at
    ):
        raise HTTPException(status_code=400, detail="Invalid or expired reset code")

    user.hashed_password = hash_password(payload.new_password)
    user.password_reset_code = None
    user.password_reset_expires_at = None
    session.add(user)
    session.commit()
    return {"status": "reset"}
