from datetime import datetime, timedelta

from sqlmodel import Session, select

from app.database import create_db_and_tables, engine
from app.models.autograph import Autograph, AutographRequest, AutographRequestStatus
from app.models.celebrity import CelebrityProfile
from app.models.concert import Concert, ConcertCelebrityLink
from app.models.roster import ManagerRoster
from app.models.stream import Stream
from app.models.user import RoleEnum, User
from app.security import hash_password

DEMO_PASSWORD = "demo1234"


def seed_demo_data() -> None:
    create_db_and_tables()

    with Session(engine) as session:
        if session.exec(select(User)).first():
            print("Database already has data — skipping seed.")
            return

        fan = User(
            email="fan@demo.com",
            hashed_password=hash_password(DEMO_PASSWORD),
            full_name="Frankie Fan",
            role=RoleEnum.fan,
        )
        celeb_user_1 = User(
            email="celeb@demo.com",
            hashed_password=hash_password(DEMO_PASSWORD),
            full_name="Cassidy Star",
            role=RoleEnum.celebrity,
        )
        celeb_user_2 = User(
            email="celeb2@demo.com",
            hashed_password=hash_password(DEMO_PASSWORD),
            full_name="Miles Rivera",
            role=RoleEnum.celebrity,
        )
        agent = User(
            email="agent@demo.com",
            hashed_password=hash_password(DEMO_PASSWORD),
            full_name="Alex Agent",
            role=RoleEnum.agent,
        )
        manager = User(
            email="manager@demo.com",
            hashed_password=hash_password(DEMO_PASSWORD),
            full_name="Morgan Manager",
            role=RoleEnum.manager,
        )
        session.add_all([fan, celeb_user_1, celeb_user_2, agent, manager])
        session.commit()
        for user in (fan, celeb_user_1, celeb_user_2, agent, manager):
            session.refresh(user)

        celeb_profile_1 = CelebrityProfile(
            user_id=celeb_user_1.id,
            stage_name="Cassidy Star",
            bio="Award-winning vocalist and songwriter.",
            category="Music",
        )
        celeb_profile_2 = CelebrityProfile(
            user_id=celeb_user_2.id,
            stage_name="Miles Rivera",
            bio="Screen actor known for leading roles in drama features.",
            category="Film",
        )
        session.add_all([celeb_profile_1, celeb_profile_2])
        session.commit()
        for profile in (celeb_profile_1, celeb_profile_2):
            session.refresh(profile)

        concert = Concert(
            agent_id=agent.id,
            title="Summer Nights Live",
            venue="Riverside Arena",
            event_date=datetime.utcnow() + timedelta(days=30),
            description="An evening of live performances headlined by Cassidy Star.",
        )
        session.add(concert)
        session.commit()
        session.refresh(concert)
        session.add(ConcertCelebrityLink(concert_id=concert.id, celebrity_id=celeb_profile_1.id))

        stream = Stream(
            celebrity_id=celeb_profile_1.id,
            title="Backstage Q&A",
            embed_url="https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            scheduled_at=datetime.utcnow() + timedelta(hours=2),
            is_live=True,
        )
        session.add(stream)

        request = AutographRequest(
            fan_id=fan.id,
            celebrity_id=celeb_profile_1.id,
            message="Loved your last album, would mean the world to get an autograph!",
            status=AutographRequestStatus.fulfilled,
        )
        session.add(request)
        session.commit()
        session.refresh(request)

        autograph = Autograph(
            celebrity_id=celeb_profile_1.id,
            request_id=request.id,
            content_url="https://placehold.co/600x400?text=Autograph",
            caption="Thanks for the support!",
        )
        session.add(autograph)

        session.add(ManagerRoster(manager_id=manager.id, celebrity_id=celeb_profile_1.id))

        session.commit()

    print("Seed complete. Demo accounts (all use password: demo1234):")
    print("  fan@demo.com       (fan)")
    print("  celeb@demo.com     (celebrity, has requests/autograph/stream/concert)")
    print("  celeb2@demo.com    (celebrity, no data yet)")
    print("  agent@demo.com     (agent, owns 'Summer Nights Live')")
    print("  manager@demo.com   (manager, manages Cassidy Star)")


if __name__ == "__main__":
    seed_demo_data()
