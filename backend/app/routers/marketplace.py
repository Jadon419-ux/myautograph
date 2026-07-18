import uuid
from datetime import datetime, timedelta

import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.database import get_session
from app.deps import get_current_user
from app.models.autograph import Autograph
from app.models.celebrity import CelebrityProfile
from app.models.marketplace import (
    Bid,
    ListingStatus,
    ListingType,
    MarketplaceListing,
    MarketplaceOrder,
    MarketplaceOrderStatus,
)
from app.models.user import User
from app.schemas.marketplace import (
    BidCreate,
    BidRead,
    ListingCreate,
    ListingRead,
    MarketplaceOrderRead,
)
from app.services.marketplace import release_listing_reservation
from app.services.paystack import initialize_transaction

router = APIRouter(prefix="/marketplace", tags=["marketplace"])


def _to_read(session: Session, listing: MarketplaceListing) -> ListingRead:
    autograph = session.get(Autograph, listing.autograph_id)
    celebrity = session.get(CelebrityProfile, autograph.celebrity_id)
    bids = session.exec(select(Bid).where(Bid.listing_id == listing.id)).all()

    return ListingRead(
        id=listing.id,
        autograph_id=listing.autograph_id,
        seller_user_id=listing.seller_user_id,
        listing_type=listing.listing_type,
        price_kobo=listing.price_kobo,
        status=listing.status,
        auction_ends_at=listing.auction_ends_at,
        created_at=listing.created_at,
        sold_at=listing.sold_at,
        celebrity_stage_name=celebrity.stage_name if celebrity else "",
        content_url=autograph.content_url,
        caption=autograph.caption,
        current_highest_bid_kobo=max((b.amount_kobo for b in bids), default=None),
        bid_count=len(bids),
    )


def _get_owned_listing(session: Session, listing_id: int, user: User) -> MarketplaceListing:
    listing = session.get(MarketplaceListing, listing_id)
    if not listing or listing.seller_user_id != user.id:
        raise HTTPException(status_code=404, detail="Listing not found")
    return listing


def _highest_bid(session: Session, listing_id: int) -> Bid | None:
    return session.exec(
        select(Bid).where(Bid.listing_id == listing_id).order_by(Bid.amount_kobo.desc())
    ).first()


@router.post("/listings", response_model=ListingRead)
def create_listing(
    payload: ListingCreate,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    autograph = session.get(Autograph, payload.autograph_id)
    if not autograph or autograph.owner_user_id != user.id:
        raise HTTPException(status_code=404, detail="Autograph not found")

    existing = session.exec(
        select(MarketplaceListing).where(
            MarketplaceListing.autograph_id == payload.autograph_id,
            MarketplaceListing.status.in_([ListingStatus.active, ListingStatus.pending_sale]),
        )
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="This autograph already has an active listing")

    auction_ends_at = None
    if payload.listing_type == ListingType.auction:
        duration = payload.auction_duration_hours or 24
        auction_ends_at = datetime.utcnow() + timedelta(hours=duration)

    listing = MarketplaceListing(
        autograph_id=payload.autograph_id,
        seller_user_id=user.id,
        listing_type=payload.listing_type,
        price_kobo=payload.price_kobo,
        auction_ends_at=auction_ends_at,
    )
    session.add(listing)
    session.commit()
    session.refresh(listing)
    return _to_read(session, listing)


@router.get("/listings", response_model=list[ListingRead])
def list_listings(session: Session = Depends(get_session)):
    listings = session.exec(
        select(MarketplaceListing).where(MarketplaceListing.status == ListingStatus.active)
    ).all()
    return [_to_read(session, listing) for listing in listings]


@router.get("/listings/{listing_id}", response_model=ListingRead)
def get_listing(listing_id: int, session: Session = Depends(get_session)):
    listing = session.get(MarketplaceListing, listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    return _to_read(session, listing)


@router.delete("/listings/{listing_id}", status_code=204)
def cancel_listing(
    listing_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    listing = _get_owned_listing(session, listing_id, user)
    if listing.status != ListingStatus.active:
        raise HTTPException(status_code=400, detail="Only an active listing can be cancelled")
    listing.status = ListingStatus.cancelled
    session.add(listing)
    session.commit()


@router.get("/listings/{listing_id}/bids", response_model=list[BidRead])
def list_bids(listing_id: int, session: Session = Depends(get_session)):
    bids = session.exec(
        select(Bid).where(Bid.listing_id == listing_id).order_by(Bid.amount_kobo.desc())
    ).all()
    result = []
    for bid in bids:
        bidder = session.get(User, bid.bidder_user_id)
        result.append(
            BidRead(
                id=bid.id,
                listing_id=bid.listing_id,
                bidder_user_id=bid.bidder_user_id,
                bidder_name=bidder.full_name if bidder else "Unknown",
                amount_kobo=bid.amount_kobo,
                created_at=bid.created_at,
            )
        )
    return result


@router.post("/listings/{listing_id}/bids", response_model=BidRead)
def place_bid(
    listing_id: int,
    payload: BidCreate,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    listing = session.get(MarketplaceListing, listing_id)
    if not listing or listing.listing_type != ListingType.auction:
        raise HTTPException(status_code=404, detail="Auction not found")
    if listing.status != ListingStatus.active:
        raise HTTPException(status_code=400, detail="This auction is not open for bids")
    if listing.auction_ends_at and datetime.utcnow() >= listing.auction_ends_at:
        raise HTTPException(status_code=400, detail="This auction has ended")
    if listing.seller_user_id == user.id:
        raise HTTPException(status_code=400, detail="You cannot bid on your own listing")

    current_highest = _highest_bid(session, listing_id)
    floor = current_highest.amount_kobo if current_highest else listing.price_kobo - 1
    if payload.amount_kobo <= floor:
        raise HTTPException(status_code=400, detail="Bid must be higher than the current highest bid")

    bid = Bid(listing_id=listing_id, bidder_user_id=user.id, amount_kobo=payload.amount_kobo)
    session.add(bid)
    session.commit()
    session.refresh(bid)
    return BidRead(
        id=bid.id,
        listing_id=bid.listing_id,
        bidder_user_id=bid.bidder_user_id,
        bidder_name=user.full_name,
        amount_kobo=bid.amount_kobo,
        created_at=bid.created_at,
    )


def _checkout(
    session: Session, listing: MarketplaceListing, buyer: User, amount_kobo: int
) -> MarketplaceOrderRead:
    listing.status = ListingStatus.pending_sale
    session.add(listing)

    order = MarketplaceOrder(
        listing_id=listing.id,
        buyer_user_id=buyer.id,
        amount_kobo=amount_kobo,
        paystack_reference=uuid.uuid4().hex,
    )
    session.add(order)
    session.commit()
    session.refresh(order)

    try:
        data = initialize_transaction(buyer.email, amount_kobo, order.paystack_reference)
        authorization_url = data.get("authorization_url")
    except HTTPException:
        release_listing_reservation(session, listing)
        raise
    except httpx.HTTPError:
        release_listing_reservation(session, listing)
        raise HTTPException(status_code=502, detail="Could not initialize payment. Please try again.")

    return MarketplaceOrderRead(**order.model_dump(), authorization_url=authorization_url)


@router.post("/listings/{listing_id}/buy", response_model=MarketplaceOrderRead)
def buy_listing(
    listing_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    listing = session.get(MarketplaceListing, listing_id)
    if not listing or listing.listing_type != ListingType.fixed_price:
        raise HTTPException(status_code=404, detail="Listing not found")
    if listing.status != ListingStatus.active:
        raise HTTPException(status_code=400, detail="This listing is not available")
    if listing.seller_user_id == user.id:
        raise HTTPException(status_code=400, detail="You cannot buy your own listing")

    return _checkout(session, listing, user, listing.price_kobo)


@router.post("/listings/{listing_id}/claim", response_model=MarketplaceOrderRead)
def claim_auction(
    listing_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    listing = session.get(MarketplaceListing, listing_id)
    if not listing or listing.listing_type != ListingType.auction:
        raise HTTPException(status_code=404, detail="Auction not found")
    if listing.status != ListingStatus.active:
        raise HTTPException(status_code=400, detail="This auction is not available")
    if not listing.auction_ends_at or datetime.utcnow() < listing.auction_ends_at:
        raise HTTPException(status_code=400, detail="This auction has not ended yet")

    winning_bid = _highest_bid(session, listing_id)
    if not winning_bid or winning_bid.bidder_user_id != user.id:
        raise HTTPException(status_code=403, detail="Only the winning bidder can claim this auction")

    return _checkout(session, listing, user, winning_bid.amount_kobo)


@router.get("/mine", response_model=list[ListingRead])
def list_my_listings(
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    listings = session.exec(
        select(MarketplaceListing).where(MarketplaceListing.seller_user_id == user.id)
    ).all()
    return [_to_read(session, listing) for listing in listings]


@router.get("/mine/bids", response_model=list[ListingRead])
def list_my_bid_listings(
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    bid_listing_ids = {
        bid.listing_id
        for bid in session.exec(select(Bid).where(Bid.bidder_user_id == user.id)).all()
    }
    listings = [session.get(MarketplaceListing, lid) for lid in bid_listing_ids]
    return [_to_read(session, listing) for listing in listings if listing]
