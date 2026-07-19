import uuid
from datetime import datetime

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select

from app.config import settings
from app.database import create_db_and_tables, engine
from app.models.autograph import Autograph, AutographMedium
from app.models.celebrity import CelebrityProfile, VerificationStatus
from app.routers import (
    admin,
    auth,
    autographs,
    celebrities,
    concerts,
    managers,
    marketplace,
    payments,
    reviews,
    social,
    streams,
    tickets,
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
            )
        ).all()
        for profile in celebs_needing_backfill:
            if profile.verification_status is None:
                profile.verification_status = VerificationStatus.approved
            if profile.created_at is None:
                profile.created_at = datetime.utcnow()
            session.add(profile)
        if celebs_needing_backfill:
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


@app.get("/health")
def health():
    return {"status": "ok"}
