from datetime import datetime

from fastapi import HTTPException
from sqlmodel import Session, select

from app.models.merchandise import CelebrityMerchandise, MerchandiseOrder, MerchandiseOrderStatus
from app.schemas.merchandise import MerchandiseOrderRead
from app.services.paystack import verify_transaction


def order_to_read(
    session: Session, order: MerchandiseOrder, authorization_url: str | None = None
) -> MerchandiseOrderRead:
    merch = session.get(CelebrityMerchandise, order.merchandise_id)
    return MerchandiseOrderRead(
        **order.model_dump(),
        merchandise_title=merch.title if merch else "",
        merchandise_image_url=merch.image_url if merch else "",
        authorization_url=authorization_url,
    )


def release_merchandise_reservation(session: Session, merch: CelebrityMerchandise, quantity: int) -> None:
    merch.quantity_reserved = max(0, merch.quantity_reserved - quantity)
    session.add(merch)
    session.commit()


def verify_and_finalize_merchandise_order(session: Session, reference: str) -> MerchandiseOrder:
    order = session.exec(
        select(MerchandiseOrder).where(MerchandiseOrder.paystack_reference == reference)
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.status != MerchandiseOrderStatus.pending:
        return order

    merch = session.get(CelebrityMerchandise, order.merchandise_id)
    data = verify_transaction(reference)

    if data.get("status") == "success" and data.get("amount") == order.amount_kobo:
        order.status = MerchandiseOrderStatus.paid
        order.paid_at = datetime.utcnow()
        merch.quantity_reserved = max(0, merch.quantity_reserved - order.quantity)
        merch.quantity_sold += order.quantity
        session.add(merch)
    else:
        order.status = MerchandiseOrderStatus.failed
        merch.quantity_reserved = max(0, merch.quantity_reserved - order.quantity)
        session.add(merch)

    session.add(order)
    session.commit()
    session.refresh(order)
    return order
