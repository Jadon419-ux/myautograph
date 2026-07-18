from datetime import datetime

from fastapi import HTTPException
from sqlmodel import Session, select

from app.models.autograph import Autograph
from app.models.autograph_transfer import AutographTransfer
from app.models.marketplace import (
    ListingStatus,
    MarketplaceListing,
    MarketplaceOrder,
    MarketplaceOrderStatus,
)
from app.services.paystack import verify_transaction


def release_listing_reservation(session: Session, listing: MarketplaceListing) -> None:
    listing.status = ListingStatus.active
    session.add(listing)
    session.commit()


def verify_and_finalize_marketplace_order(session: Session, reference: str) -> MarketplaceOrder:
    order = session.exec(
        select(MarketplaceOrder).where(MarketplaceOrder.paystack_reference == reference)
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.status != MarketplaceOrderStatus.pending:
        return order

    listing = session.get(MarketplaceListing, order.listing_id)
    data = verify_transaction(reference)

    if data.get("status") == "success" and data.get("amount") == order.amount_kobo:
        order.status = MarketplaceOrderStatus.paid
        order.paid_at = datetime.utcnow()

        listing.status = ListingStatus.sold
        listing.sold_at = datetime.utcnow()
        session.add(listing)

        autograph = session.get(Autograph, listing.autograph_id)
        session.add(
            AutographTransfer(
                autograph_id=autograph.id,
                from_user_id=listing.seller_user_id,
                to_user_id=order.buyer_user_id,
                note="Purchased via marketplace",
            )
        )
        autograph.owner_user_id = order.buyer_user_id
        session.add(autograph)
    else:
        order.status = MarketplaceOrderStatus.failed
        listing.status = ListingStatus.active
        session.add(listing)

    session.add(order)
    session.commit()
    session.refresh(order)
    return order
