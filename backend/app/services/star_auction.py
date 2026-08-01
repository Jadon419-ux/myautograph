from datetime import datetime

from sqlmodel import Session, select

from app.models.celebrity import CelebrityProfile
from app.models.star_auction import StarAuction, StarAuctionBid, StarAuctionStatus
from app.models.user import User
from app.models.wallet import WalletTransaction, WalletTransactionType


def highest_bid(session: Session, auction_id: int) -> StarAuctionBid | None:
    return session.exec(
        select(StarAuctionBid)
        .where(StarAuctionBid.auction_id == auction_id)
        .order_by(StarAuctionBid.amount_kobo.desc())
    ).first()


def settle_if_ended(session: Session, auction: StarAuction) -> StarAuction:
    if auction.status != StarAuctionStatus.active or datetime.utcnow() < auction.ends_at:
        return auction

    winning_bid = highest_bid(session, auction.id)

    if winning_bid is None:
        auction.status = StarAuctionStatus.unsold
        auction.settled_at = datetime.utcnow()
        session.add(auction)
        session.commit()
        session.refresh(auction)
        return auction

    winner = session.get(User, winning_bid.bidder_user_id)
    winner.wallet_balance_kobo -= winning_bid.amount_kobo
    winner.wallet_held_kobo -= winning_bid.amount_kobo
    session.add(winner)
    session.add(
        WalletTransaction(
            user_id=winner.id,
            type=WalletTransactionType.auction_win,
            amount_kobo=-winning_bid.amount_kobo,
            description=f"Won auction: {auction.title}",
        )
    )

    celebrity = session.get(CelebrityProfile, auction.celebrity_id)
    if celebrity:
        celebrity_user = session.get(User, celebrity.user_id)
        celebrity_user.wallet_balance_kobo += winning_bid.amount_kobo
        session.add(celebrity_user)
        session.add(
            WalletTransaction(
                user_id=celebrity_user.id,
                type=WalletTransactionType.auction_sale,
                amount_kobo=winning_bid.amount_kobo,
                description=f"Auction sale: {auction.title}",
            )
        )

    auction.status = StarAuctionStatus.sold
    auction.winning_bid_id = winning_bid.id
    auction.settled_at = datetime.utcnow()
    session.add(auction)
    session.commit()
    session.refresh(auction)
    return auction
