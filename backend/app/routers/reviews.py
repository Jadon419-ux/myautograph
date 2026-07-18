from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.database import get_session
from app.deps import get_current_user
from app.models.autograph import Autograph
from app.models.celebrity import CelebrityProfile
from app.models.concert import Concert
from app.models.marketplace import MarketplaceListing, MarketplaceOrder, MarketplaceOrderStatus
from app.models.review import Review, ReviewTargetType
from app.models.ticket import Ticket, TicketStatus
from app.models.user import User
from app.schemas.review import ReviewCreate, ReviewListRead, ReviewRead

router = APIRouter(prefix="/reviews", tags=["reviews"])


def _check_eligibility(session: Session, user: User, target_type: ReviewTargetType, target_id: int) -> None:
    if target_type == ReviewTargetType.celebrity:
        if not session.get(CelebrityProfile, target_id):
            raise HTTPException(status_code=404, detail="Celebrity not found")
        owns = session.exec(
            select(Autograph).where(
                Autograph.owner_user_id == user.id, Autograph.celebrity_id == target_id
            )
        ).first()
        if not owns:
            raise HTTPException(
                status_code=403,
                detail="You need to own an autograph from this celebrity to review them.",
            )
    elif target_type == ReviewTargetType.concert:
        if not session.get(Concert, target_id):
            raise HTTPException(status_code=404, detail="Concert not found")
        ticket = session.exec(
            select(Ticket).where(
                Ticket.buyer_user_id == user.id,
                Ticket.concert_id == target_id,
                Ticket.status.in_([TicketStatus.valid, TicketStatus.checked_in]),
            )
        ).first()
        if not ticket:
            raise HTTPException(
                status_code=403, detail="You need a valid ticket to this concert to review it."
            )
    else:
        if not session.get(MarketplaceListing, target_id):
            raise HTTPException(status_code=404, detail="Listing not found")
        order = session.exec(
            select(MarketplaceOrder).where(
                MarketplaceOrder.buyer_user_id == user.id,
                MarketplaceOrder.listing_id == target_id,
                MarketplaceOrder.status == MarketplaceOrderStatus.paid,
            )
        ).first()
        if not order:
            raise HTTPException(
                status_code=403, detail="You need to have bought this listing to review it."
            )


def _to_review_read(session: Session, review: Review) -> ReviewRead:
    author = session.get(User, review.author_user_id)
    return ReviewRead(
        id=review.id,
        author_user_id=review.author_user_id,
        author_name=author.full_name if author else "Unknown",
        author_avatar_url=author.avatar_url if author else None,
        target_type=review.target_type,
        target_id=review.target_id,
        rating=review.rating,
        comment=review.comment,
        created_at=review.created_at,
    )


def _create_review(
    session: Session,
    user: User,
    target_type: ReviewTargetType,
    target_id: int,
    payload: ReviewCreate,
) -> ReviewRead:
    if not (1 <= payload.rating <= 5):
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5.")

    existing = session.exec(
        select(Review).where(
            Review.author_user_id == user.id,
            Review.target_type == target_type,
            Review.target_id == target_id,
        )
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="You have already reviewed this.")

    review = Review(
        author_user_id=user.id,
        target_type=target_type,
        target_id=target_id,
        rating=payload.rating,
        comment=payload.comment,
    )
    session.add(review)
    session.commit()
    session.refresh(review)
    return _to_review_read(session, review)


def _list_reviews(session: Session, target_type: ReviewTargetType, target_id: int) -> ReviewListRead:
    reviews = session.exec(
        select(Review)
        .where(Review.target_type == target_type, Review.target_id == target_id)
        .order_by(Review.created_at.desc())
    ).all()
    average = round(sum(r.rating for r in reviews) / len(reviews), 2) if reviews else 0.0
    return ReviewListRead(
        reviews=[_to_review_read(session, r) for r in reviews],
        average_rating=average,
        review_count=len(reviews),
    )


@router.post("/celebrity/{celebrity_id}", response_model=ReviewRead)
def review_celebrity(
    celebrity_id: int,
    payload: ReviewCreate,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    _check_eligibility(session, user, ReviewTargetType.celebrity, celebrity_id)
    return _create_review(session, user, ReviewTargetType.celebrity, celebrity_id, payload)


@router.post("/concert/{concert_id}", response_model=ReviewRead)
def review_concert(
    concert_id: int,
    payload: ReviewCreate,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    _check_eligibility(session, user, ReviewTargetType.concert, concert_id)
    return _create_review(session, user, ReviewTargetType.concert, concert_id, payload)


@router.post("/marketplace/{listing_id}", response_model=ReviewRead)
def review_marketplace_listing(
    listing_id: int,
    payload: ReviewCreate,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    _check_eligibility(session, user, ReviewTargetType.marketplace_listing, listing_id)
    return _create_review(session, user, ReviewTargetType.marketplace_listing, listing_id, payload)


@router.get("/celebrity/{celebrity_id}", response_model=ReviewListRead)
def list_celebrity_reviews(celebrity_id: int, session: Session = Depends(get_session)):
    return _list_reviews(session, ReviewTargetType.celebrity, celebrity_id)


@router.get("/concert/{concert_id}", response_model=ReviewListRead)
def list_concert_reviews(concert_id: int, session: Session = Depends(get_session)):
    return _list_reviews(session, ReviewTargetType.concert, concert_id)


@router.get("/marketplace/{listing_id}", response_model=ReviewListRead)
def list_marketplace_reviews(listing_id: int, session: Session = Depends(get_session)):
    return _list_reviews(session, ReviewTargetType.marketplace_listing, listing_id)


@router.get("/mine", response_model=list[ReviewRead])
def list_my_reviews(
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    reviews = session.exec(
        select(Review).where(Review.author_user_id == user.id).order_by(Review.created_at.desc())
    ).all()
    return [_to_review_read(session, r) for r in reviews]


@router.delete("/{review_id}", status_code=204)
def delete_review(
    review_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    review = session.get(Review, review_id)
    if not review or review.author_user_id != user.id:
        raise HTTPException(status_code=404, detail="Review not found")
    session.delete(review)
    session.commit()
