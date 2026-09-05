from datetime import datetime

from fastapi import HTTPException
from sqlmodel import Session, select

from app.models.celebrity import CelebrityProfile
from app.models.roster import ManagerRoster
from app.models.stream import Stream
from app.models.stream_order import StreamAccessOrder, StreamOrderStatus
from app.models.user import User
from app.models.wallet import WalletTransaction, WalletTransactionType
from app.services.paystack import verify_transaction


def user_has_stream_access(session: Session, stream: Stream, user: User | None) -> bool:
    if stream.price_kobo <= 0:
        return True
    if user is None:
        return False

    celebrity = session.get(CelebrityProfile, stream.celebrity_id)
    if celebrity and celebrity.user_id == user.id:
        return True

    manages_star = session.exec(
        select(ManagerRoster).where(
            ManagerRoster.manager_id == user.id, ManagerRoster.celebrity_id == stream.celebrity_id
        )
    ).first()
    if manages_star:
        return True

    paid_order = session.exec(
        select(StreamAccessOrder).where(
            StreamAccessOrder.stream_id == stream.id,
            StreamAccessOrder.buyer_user_id == user.id,
            StreamAccessOrder.status == StreamOrderStatus.paid,
        )
    ).first()
    return paid_order is not None


def verify_and_finalize_stream_order(session: Session, reference: str) -> StreamAccessOrder:
    order = session.exec(
        select(StreamAccessOrder).where(StreamAccessOrder.paystack_reference == reference)
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.status != StreamOrderStatus.pending:
        return order

    data = verify_transaction(reference)

    if data.get("status") == "success" and data.get("amount") == order.amount_kobo:
        order.status = StreamOrderStatus.paid
        order.paid_at = datetime.utcnow()

        stream = session.get(Stream, order.stream_id)
        celebrity = session.get(CelebrityProfile, stream.celebrity_id) if stream else None
        if celebrity:
            celebrity_user = session.get(User, celebrity.user_id)
            celebrity_user.wallet_balance_kobo += order.amount_kobo
            session.add(celebrity_user)
            session.add(
                WalletTransaction(
                    user_id=celebrity_user.id,
                    type=WalletTransactionType.livestream_sale,
                    amount_kobo=order.amount_kobo,
                    description=f"Livestream access: {stream.title if stream else ''}",
                )
            )
    else:
        order.status = StreamOrderStatus.failed

    session.add(order)
    session.commit()
    session.refresh(order)
    return order
