from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.database import get_session
from app.deps import get_transport_company_for_user, require_role
from app.models.transport import TransportBus, TransportCompany
from app.models.user import RoleEnum, User
from app.schemas.transport import (
    TransportBusCreate,
    TransportBusRead,
    TransportBusUpdate,
    TransportCompanyCreate,
    TransportCompanyRead,
    TransportCompanyUpdate,
)

router = APIRouter(prefix="/transport", tags=["transport"])


def _company_to_read(session: Session, company: TransportCompany) -> TransportCompanyRead:
    bus_count = len(
        session.exec(select(TransportBus).where(TransportBus.company_id == company.id)).all()
    )
    return TransportCompanyRead(
        id=company.id,
        owner_user_id=company.owner_user_id,
        name=company.name,
        description=company.description,
        logo_url=company.logo_url,
        bus_count=bus_count,
        created_at=company.created_at,
    )


def _bus_to_read(session: Session, bus: TransportBus) -> TransportBusRead:
    company = session.get(TransportCompany, bus.company_id)
    return TransportBusRead(
        id=bus.id,
        company_id=bus.company_id,
        company_name=company.name if company else "",
        name=bus.name,
        plate_number=bus.plate_number,
        capacity=bus.capacity,
        description=bus.description,
        is_active=bus.is_active,
        created_at=bus.created_at,
    )


def _get_owned_bus(session: Session, bus_id: int, company: TransportCompany) -> TransportBus:
    bus = session.get(TransportBus, bus_id)
    if not bus or bus.company_id != company.id:
        raise HTTPException(status_code=404, detail="Bus not found")
    return bus


@router.post("/companies", response_model=TransportCompanyRead)
def create_company(
    payload: TransportCompanyCreate,
    session: Session = Depends(get_session),
    user: User = Depends(require_role(RoleEnum.transport_manager)),
):
    existing = session.exec(
        select(TransportCompany).where(TransportCompany.owner_user_id == user.id)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="You already have a transport company")

    if not payload.name or not payload.name.strip():
        raise HTTPException(status_code=400, detail="Company name is required")

    company = TransportCompany(
        owner_user_id=user.id,
        name=payload.name.strip(),
        description=payload.description,
        logo_url=payload.logo_url,
    )
    session.add(company)
    session.commit()
    session.refresh(company)
    return _company_to_read(session, company)


@router.get("/companies", response_model=list[TransportCompanyRead])
def list_companies(session: Session = Depends(get_session)):
    companies = session.exec(select(TransportCompany)).all()
    return [_company_to_read(session, c) for c in companies]


@router.get("/companies/me", response_model=TransportCompanyRead)
def get_my_company(
    session: Session = Depends(get_session),
    user: User = Depends(require_role(RoleEnum.transport_manager)),
):
    company = get_transport_company_for_user(user, session)
    return _company_to_read(session, company)


@router.patch("/companies/me", response_model=TransportCompanyRead)
def update_my_company(
    payload: TransportCompanyUpdate,
    session: Session = Depends(get_session),
    user: User = Depends(require_role(RoleEnum.transport_manager)),
):
    company = get_transport_company_for_user(user, session)
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(company, field, value)
    session.add(company)
    session.commit()
    session.refresh(company)
    return _company_to_read(session, company)


@router.get("/companies/{company_id}", response_model=TransportCompanyRead)
def get_company(company_id: int, session: Session = Depends(get_session)):
    company = session.get(TransportCompany, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Transport company not found")
    return _company_to_read(session, company)


@router.get("/companies/{company_id}/buses", response_model=list[TransportBusRead])
def list_company_buses(company_id: int, session: Session = Depends(get_session)):
    company = session.get(TransportCompany, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Transport company not found")
    buses = session.exec(
        select(TransportBus).where(
            TransportBus.company_id == company_id, TransportBus.is_active.is_(True)
        )
    ).all()
    return [_bus_to_read(session, b) for b in buses]


@router.post("/buses", response_model=TransportBusRead)
def create_bus(
    payload: TransportBusCreate,
    session: Session = Depends(get_session),
    user: User = Depends(require_role(RoleEnum.transport_manager)),
):
    company = get_transport_company_for_user(user, session)

    if not payload.name or not payload.name.strip():
        raise HTTPException(status_code=400, detail="Bus name is required")
    if not payload.plate_number or not payload.plate_number.strip():
        raise HTTPException(status_code=400, detail="Plate number is required")
    if payload.capacity < 1:
        raise HTTPException(status_code=400, detail="Capacity must be at least 1")

    bus = TransportBus(
        company_id=company.id,
        name=payload.name.strip(),
        plate_number=payload.plate_number.strip(),
        capacity=payload.capacity,
        description=payload.description,
    )
    session.add(bus)
    session.commit()
    session.refresh(bus)
    return _bus_to_read(session, bus)


@router.get("/buses/mine", response_model=list[TransportBusRead])
def list_my_buses(
    session: Session = Depends(get_session),
    user: User = Depends(require_role(RoleEnum.transport_manager)),
):
    company = get_transport_company_for_user(user, session)
    buses = session.exec(select(TransportBus).where(TransportBus.company_id == company.id)).all()
    return [_bus_to_read(session, b) for b in buses]


@router.patch("/buses/{bus_id}", response_model=TransportBusRead)
def update_bus(
    bus_id: int,
    payload: TransportBusUpdate,
    session: Session = Depends(get_session),
    user: User = Depends(require_role(RoleEnum.transport_manager)),
):
    company = get_transport_company_for_user(user, session)
    bus = _get_owned_bus(session, bus_id, company)

    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(bus, field, value)
    session.add(bus)
    session.commit()
    session.refresh(bus)
    return _bus_to_read(session, bus)


@router.delete("/buses/{bus_id}", status_code=204)
def delete_bus(
    bus_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(require_role(RoleEnum.transport_manager)),
):
    company = get_transport_company_for_user(user, session)
    bus = _get_owned_bus(session, bus_id, company)
    session.delete(bus)
    session.commit()
