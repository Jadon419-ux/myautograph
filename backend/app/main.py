import uuid
from datetime import datetime

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select

from app.config import settings
from app.database import create_db_and_tables, engine
from app.models.autograph import Autograph, AutographMedium, AutographRequest, AutographRequestType
from app.models.celebrity import CelebrityProfile, VerificationStatus
from app.models.concert import Concert
from app.models.referral import ReferralLink
from app.models.ticket_category import TicketCategory
from app.models.ticket_order import TicketOrder
from app.models.user import User
from app.routers import (
    admin,
    auth,
    autographs,
    celebrities,
    chatbot,
    concerts,
    managers,
    marketplace,
    merchandise,
    payments,
    reviews,
    social,
    star_auction,
    streams,
    tickets,
    transport,
    wallet,
    withdrawals,
)

app = FastAPI(title="My Autograph API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    create_db_and_tables()
    with Session(engine) as session:
        needs_backfill = session.exec(
            select(Autograph).where(
                Autograph.verification_code.is_(None)
                | (Autograph.medium.is_(None))
                | (Autograph.is_publicly_visible.is_(None))
                | (Autograph.recipient_name.is_(None))
                | (Autograph.issued_at.is_(None))
            )
        ).all()
        for autograph in needs_backfill:
            if autograph.verification_code is None:
                autograph.verification_code = uuid.uuid4().hex[:12]
            if autograph.medium is None:
                autograph.medium = AutographMedium.digital
            if autograph.is_publicly_visible is None:
                autograph.is_publicly_visible = True
            if autograph.recipient_name is None:
                autograph.recipient_name = ""
            if autograph.issued_at is None:
                autograph.issued_at = autograph.created_at or datetime.utcnow()
            session.add(autograph)
        if needs_backfill:
            session.commit()

        celebs_needing_backfill = session.exec(
            select(CelebrityProfile).where(
                CelebrityProfile.verification_status.is_(None)
                | (CelebrityProfile.created_at.is_(None))
                | (CelebrityProfile.rejection_reason.is_(None))
            )
        ).all()
        for profile in celebs_needing_backfill:
            if profile.verification_status is None:
                profile.verification_status = VerificationStatus.approved
            if profile.created_at is None:
                profile.created_at = datetime.utcnow()
            if profile.rejection_reason is None:
                profile.rejection_reason = ""
            session.add(profile)
        if celebs_needing_backfill:
            session.commit()

        users_needing_backfill = session.exec(
            select(User).where(
                User.wallet_balance_kobo.is_(None)
                | User.wallet_held_kobo.is_(None)
                | User.is_email_verified.is_(None)
                | User.phone_number.is_(None)
                | User.location.is_(None)
            )
        ).all()
        for backfill_user in users_needing_backfill:
            if backfill_user.wallet_balance_kobo is None:
                backfill_user.wallet_balance_kobo = 0
            if backfill_user.wallet_held_kobo is None:
                backfill_user.wallet_held_kobo = 0
            if backfill_user.is_email_verified is None:
                # Grandfather existing accounts — email verification only applies going forward.
                backfill_user.is_email_verified = True
            if backfill_user.phone_number is None:
                # Grandfather existing accounts — phone number is only required going forward.
                backfill_user.phone_number = ""
            if backfill_user.location is None:
                # Grandfather existing accounts — location is only required going forward.
                backfill_user.location = ""
            session.add(backfill_user)
        if users_needing_backfill:
            session.commit()

        requests_needing_backfill = session.exec(
            select(AutographRequest).where(AutographRequest.request_type.is_(None))
        ).all()
        for request in requests_needing_backfill:
            request.request_type = AutographRequestType.online
            session.add(request)
        if requests_needing_backfill:
            session.commit()

        concerts_needing_backfill = session.exec(
            select(Concert).where(Concert.agent_commission_percent.is_(None))
        ).all()
        for concert in concerts_needing_backfill:
            concert.agent_commission_percent = 0.0
            session.add(concert)
        if concerts_needing_backfill:
            session.commit()

        orders_needing_backfill = session.exec(
            select(TicketOrder).where(
                TicketOrder.recipient_name.is_(None) | TicketOrder.recipient_email.is_(None)
            )
        ).all()
        for order in orders_needing_backfill:
            if order.recipient_name is None:
                order.recipient_name = ""
            if order.recipient_email is None:
                order.recipient_email = ""
            session.add(order)
        if orders_needing_backfill:
            session.commit()

        categories_needing_backfill = session.exec(
            select(TicketCategory).where(TicketCategory.description.is_(None))
        ).all()
        for category in categories_needing_backfill:
            category.description = ""
            session.add(category)
        if categories_needing_backfill:
            session.commit()

        referrals_needing_backfill = session.exec(
            select(ReferralLink).where(ReferralLink.requested_by_invitee.is_(None))
        ).all()
        for link in referrals_needing_backfill:
            link.requested_by_invitee = False
            session.add(link)
        if referrals_needing_backfill:
            session.commit()


app.include_router(auth.router)
app.include_router(celebrities.router)
app.include_router(autographs.router)
app.include_router(concerts.router)
app.include_router(streams.router)
app.include_router(managers.router)
app.include_router(tickets.router)
app.include_router(payments.router)
app.include_router(marketplace.router)
app.include_router(social.router)
app.include_router(reviews.router)
app.include_router(admin.router)
app.include_router(wallet.router)
app.include_router(merchandise.router)
app.include_router(star_auction.router)
app.include_router(transport.router)
app.include_router(withdrawals.router)
app.include_router(chatbot.router)


@app.get("/health")
def health():
    return {"status": "ok"}
