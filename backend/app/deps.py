from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import Session, select

from app.database import get_session
from app.models.celebrity import CelebrityProfile
from app.models.user import User, RoleEnum
from app.security import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    session: Session = Depends(get_session),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    email = decode_access_token(token)
    if email is None:
        raise credentials_exception
    user = session.exec(select(User).where(User.email == email)).first()
    if user is None:
        raise credentials_exception
    return user


def require_role(*allowed: RoleEnum):
    def checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized for this action",
            )
        return user

    return checker


def get_celebrity_profile_for_user(user: User, session: Session) -> CelebrityProfile:
    profile = session.exec(
        select(CelebrityProfile).where(CelebrityProfile.user_id == user.id)
    ).first()
    if profile is None:
        raise HTTPException(status_code=404, detail="Celebrity profile not found")
    return profile
