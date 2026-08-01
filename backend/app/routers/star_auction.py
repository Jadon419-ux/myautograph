from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.database import get_session
from app.deps import get_celebrity_profile_for_user, get_current_user, require_role
from app.models.celebrity import CelebrityProfile, VerificationStatus
from app.models.star_auction import StarAuction, StarAuctionBid, StarAuctionStatus
from app.models.user import RoleEnum, User
from app.schemas.star_auction import (
    StarAuctionBidCreate,
    StarAuctionBidRead,
    StarAuctionCreate,
    StarAuctionRead,
)
from app.services.star_auction import highest_bid, settle_if_ended

router = APIRouter(prefix="/star-auctions", tags=["star-auctions"])


def _require_approved(profile: CelebrityProfile) -> None:
    if profile.verification_status == VerificationStatus.rejected:
        detail = "Your celebrity account verification was rejected"
        if profile.rejection_reason:
            detail += f": {profile.rejection_reason}"
        raise HTTPException(status_code=403, detail=detail)
    if profile.verification_status != VerificationStatus.approved:
        raise HTTPException(
            status_code=403,
            detail="Your celebrity account is pending verification. You'll be able to run auctions once approved.",
        )


def _to_read(session: Session, auction: StarAuction) -> StarAuctionRead:
    celebrity = session.get(CelebrityProfile, auction.celebrity_id)
    bids = session.exec(
        select(StarAuctionBid).where(StarAuctionBid.auction_id == auction.id)
    ).all()
    return StarAuctionRead(
        id=auction.id,
        celebrity_id=auction.celebrity_id,
        celebrity_stage_name=celebrity.stage_name if celebrity else "",
        title=auction.title,
        description=auction.description,
        image_url=auction.image_url,
        starting_price_kobo=auction.starting_price_kobo,
        current_highest_bid_kobo=max((b.amount_kobo for b in bids), default=None),
        bid_count=len(bids),
        ends_at=auction.ends_at,
        status=auction.status,
        winning_bid_id=auction.winning_bid_id,
        created_at=auction.created_at,
        settled_at=auction.settled_at,
    )


def _get_owned_auction(session: Session, auction_id: int, profile: CelebrityProfile) -> StarAuction:
    auction = session.get(StarAuction, auction_id)
    if not auction or auction.celebrity_id != profile.id:
        raise HTTPException(status_code=404, detail="Auction not found")
    return auction


@router.post("", response_model=StarAuctionRead)
def create_auction(
    payload: StarAuctionCreate,
    session: Session = Depends(get_session),
    user: User = Depends(require_role(RoleEnum.celebrity)),
):
    profile = get_celebrity_profile_for_user(user, session)
    _require_approved(profile)

    if payload.starting_price_kobo < 1:
        raise HTTPException(status_code=400, detail="Starting price must be at least ₦0.01")
    if payload.duration_hours < 1:
        raise HTTPException(status_code=400, detail="Duration must be at least 1 hour")

    auction = StarAuction(
        celebrity_id=profile.id,
        title=payload.title,
        description=payload.description,
        image_url=payload.image_url,
        starting_price_kobo=payload.starting_price_kobo,
        ends_at=datetime.utcnow() + timedelta(hours=payload.duration_hours),
    )
    session.add(auction)
    session.commit()
    session.refresh(auction)
    return _to_read(session, auction)


@router.get("", response_model=list[StarAuctionRead])
def list_auctions(session: Session = Depends(get_session)):
    auctions = session.exec(
        select(StarAuction).where(StarAuction.status == StarAuctionStatus.active)
    ).all()
    return [_to_read(session, settle_if_ended(session, a)) for a in auctions]


@router.get("/mine", response_model=list[StarAuctionRead])
def list_my_auctions(
    session: Session = Depends(get_session),
    user: User = Depends(require_role(RoleEnum.celebrity)),
):
    profile = get_celebrity_profile_for_user(user, session)
    auctions = session.exec(
        select(StarAuction).where(StarAuction.celebrity_id == profile.id)
    ).all()
    return [_to_read(session, settle_if_ended(session, a)) for a in auctions]


@router.get("/mine/bids", response_model=list[StarAuctionRead])
def list_my_bid_auctions(
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    auction_ids = {
        b.auction_id
        for b in session.exec(
            select(StarAuctionBid).where(StarAuctionBid.bidder_user_id == user.id)
        ).all()
    }
    auctions = [session.get(StarAuction, aid) for aid in auction_ids]
    return [_to_read(session, settle_if_ended(session, a)) for a in auctions if a]


@router.get("/{auction_id}", response_model=StarAuctionRead)
def get_auction(auction_id: int, session: Session = Depends(get_session)):
    auction = session.get(StarAuction, auction_id)
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")
    return _to_read(session, settle_if_ended(session, auction))


@router.get("/{auction_id}/bids", response_model=list[StarAuctionBidRead])
def list_bids(auction_id: int, session: Session = Depends(get_session)):
    bids = session.exec(
        select(StarAuctionBid)
        .where(StarAuctionBid.auction_id == auction_id)
        .order_by(StarAuctionBid.amount_kobo.desc())
    ).all()
    result = []
    for bid in bids:
        bidder = session.get(User, bid.bidder_user_id)
        result.append(
            StarAuctionBidRead(
                id=bid.id,
                auction_id=bid.auction_id,
                bidder_user_id=bid.bidder_user_id,
                bidder_name=bidder.full_name if bidder else "Unknown",
                amount_kobo=bid.amount_kobo,
                created_at=bid.created_at,
            )
        )
    return result


@router.post("/{auction_id}/bids", response_model=StarAuctionBidRead)
def place_bid(
    auction_id: int,
    payload: StarAuctionBidCreate,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    auction = session.get(StarAuction, auction_id)
    if not auction:
        raise HTTPException(status_code=404, detail="Auction not found")
    auction = settle_if_ended(session, auction)
    if auction.status != StarAuctionStatus.active:
        raise HTTPException(status_code=400, detail="This auction is not open for bids")

    profile = session.get(CelebrityProfile, auction.celebrity_id)
    if profile and profile.user_id == user.id:
        raise HTTPException(status_code=400, detail="You cannot bid on your own auction")

    current_highest = highest_bid(session, auction_id)
    floor = current_highest.amount_kobo if current_highest else auction.starting_price_kobo - 1
    if payload.amount_kobo <= floor:
        raise HTTPException(status_code=400, detail="Bid must be higher than the current highest bid")

    own_existing_hold = (
        current_highest.amount_kobo
        if current_highest and current_highest.bidder_user_id == user.id
        else 0
    )
    available = user.wallet_balance_kobo - user.wallet_held_kobo + own_existing_hold
    if payload.amount_kobo > available:
        raise HTTPException(
            status_code=400,
            detail="Insufficient wallet balance for this bid. Fund your wallet first.",
        )

    if current_highest:
        previous_bidder = session.get(User, current_highest.bidder_user_id)
        previous_bidder.wallet_held_kobo -= current_highest.amount_kobo
        session.add(previous_bidder)

    user.wallet_held_kobo += payload.amount_kobo
    session.add(user)

    bid = StarAuctionBid(auction_id=auction_id, bidder_user_id=user.id, amount_kobo=payload.amount_kobo)
    session.add(bid)
    session.commit()
    session.refresh(bid)
    return StarAuctionBidRead(
        id=bid.id,
        auction_id=bid.auction_id,
        bidder_user_id=bid.bidder_user_id,
        bidder_name=user.full_name,
        amount_kobo=bid.amount_kobo,
        created_at=bid.created_at,
    )


@router.delete("/{auction_id}", status_code=204)
def cancel_auction(
    auction_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(require_role(RoleEnum.celebrity)),
):
    profile = get_celebrity_profile_for_user(user, session)
    auction = _get_owned_auction(session, auction_id, profile)
    if auction.status != StarAuctionStatus.active:
        raise HTTPException(status_code=400, detail="Only an active auction can be cancelled")
    if highest_bid(session, auction_id) is not None:
        raise HTTPException(status_code=400, detail="Cannot cancel an auction that already has bids")
    auction.status = StarAuctionStatus.cancelled
    session.add(auction)
    session.commit()
