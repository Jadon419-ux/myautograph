from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.database import get_session
from app.deps import get_current_user
from app.models.authenticator import AuthenticatorStatus, EventAuthenticator
from app.models.concert import Concert
from app.models.user import User
from app.schemas.authenticator import AuthenticatorInviteCreate, AuthenticatorRead

router = APIRouter(prefix="/authenticators", tags=["authenticators"])


def _to_read(session: Session, link: EventAuthenticator) -> AuthenticatorRead:
    concert = session.get(Concert, link.concert_id)
    inviter = session.get(User, link.inviter_user_id)
    invitee = session.get(User, link.invitee_user_id)
    return AuthenticatorRead(
        id=link.id,
        concert_id=link.concert_id,
        concert_title=concert.title if concert else "",
        venue=concert.venue if concert else "",
        event_date=concert.event_date if concert else link.created_at,
        inviter_user_id=link.inviter_user_id,
        invitee_user_id=link.invitee_user_id,
        inviter_name=inviter.full_name if inviter else "",
        invitee_name=invitee.full_name if invitee else "",
        status=link.status,
        created_at=link.created_at,
        accepted_at=link.accepted_at,
    )


@router.post("/concerts/{concert_id}/invite", response_model=AuthenticatorRead)
def invite_authenticator(
    concert_id: int,
    payload: AuthenticatorInviteCreate,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    concert = session.get(Concert, concert_id)
    if not concert or concert.agent_id != user.id:
        raise HTTPException(status_code=404, detail="Event not found")

    email = payload.email.strip().lower()
    invitee = session.exec(select(User).where(User.email == email)).first()
    if not invitee:
        raise HTTPException(
            status_code=404, detail="No My Autograph account found with that email"
        )
    if invitee.id == user.id:
        raise HTTPException(status_code=400, detail="You can't invite yourself")

    existing = session.exec(
        select(EventAuthenticator).where(
            EventAuthenticator.concert_id == concert_id,
            EventAuthenticator.invitee_user_id == invitee.id,
            EventAuthenticator.status == AuthenticatorStatus.pending,
        )
    ).first()
    if existing:
        raise HTTPException(
            status_code=400, detail="This person already has a pending invite for this event"
        )

    link = EventAuthenticator(
        concert_id=concert_id, inviter_user_id=user.id, invitee_user_id=invitee.id
    )
    session.add(link)
    session.commit()
    session.refresh(link)

    from app.services.email import send_authenticator_invite_email

    try:
        send_authenticator_invite_email(
            to_email=invitee.email,
            invitee_name=invitee.full_name,
            inviter_name=user.full_name,
            concert_title=concert.title,
        )
    except Exception as exc:  # never let email failure break the invite
        print(f"Failed to send authenticator invite email for link {link.id}: {exc}")

    return _to_read(session, link)


@router.get("/mine", response_model=list[AuthenticatorRead])
def list_my_authenticator_invites(
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    links = session.exec(
        select(EventAuthenticator).where(
            (EventAuthenticator.invitee_user_id == user.id)
            | (EventAuthenticator.inviter_user_id == user.id)
        )
    ).all()
    return [_to_read(session, link) for link in links]


@router.post("/{authenticator_id}/accept", response_model=AuthenticatorRead)
def accept_authenticator_invite(
    authenticator_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    link = session.get(EventAuthenticator, authenticator_id)
    if not link or link.invitee_user_id != user.id or link.status != AuthenticatorStatus.pending:
        raise HTTPException(status_code=404, detail="Invite not found")
    link.status = AuthenticatorStatus.accepted
    link.accepted_at = datetime.utcnow()
    session.add(link)
    session.commit()
    session.refresh(link)
    return _to_read(session, link)


@router.post("/{authenticator_id}/decline", response_model=AuthenticatorRead)
def decline_authenticator_invite(
    authenticator_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    link = session.get(EventAuthenticator, authenticator_id)
    if not link or link.invitee_user_id != user.id or link.status != AuthenticatorStatus.pending:
        raise HTTPException(status_code=404, detail="Invite not found")
    link.status = AuthenticatorStatus.declined
    session.add(link)
    session.commit()
    session.refresh(link)
    return _to_read(session, link)
