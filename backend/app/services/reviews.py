from datetime import date

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.core.errors import AppError, not_found
from app.models import Booking, Listing, Review, User
from app.schemas.common import Page
from app.schemas.listing import RatingBreakdown
from app.schemas.review import ReviewCreate, ReviewOut


def to_review_out(review: Review) -> ReviewOut:
    author = review.booking.guest
    return ReviewOut(id=review.id, author_name=author.name, author_avatar_url=author.avatar_url,
                     rating=review.rating, comment=review.comment, created_at=review.created_at)


def _for_listing(listing_id: int):
    return select(Review).join(Booking, Booking.id == Review.booking_id).where(Booking.listing_id == listing_id)


def list_reviews(db: Session, listing_id: int, page: int, page_size: int) -> Page[ReviewOut]:
    total = db.scalar(select(func.count()).select_from(_for_listing(listing_id).subquery())) or 0
    rows = db.scalars(
        _for_listing(listing_id)
        .order_by(Review.created_at.desc(), Review.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .options(selectinload(Review.booking).selectinload(Booking.guest))
    ).all()
    return Page[ReviewOut](items=[to_review_out(r) for r in rows], page=page, page_size=page_size,
                           total=total, has_more=page * page_size < total)


def rating_breakdown(db: Session, listing_id: int) -> RatingBreakdown | None:
    row = db.execute(
        select(
            func.count(Review.id), func.avg(Review.cleanliness_rating), func.avg(Review.accuracy_rating),
            func.avg(Review.check_in_rating), func.avg(Review.communication_rating),
            func.avg(Review.location_rating), func.avg(Review.value_rating),
        ).join(Booking, Booking.id == Review.booking_id).where(Booking.listing_id == listing_id)
    ).one()
    if row[0] == 0:
        return None
    cleanliness, accuracy, check_in, communication, location, value = (round(float(v), 1) for v in row[1:])
    return RatingBreakdown(cleanliness=cleanliness, accuracy=accuracy, check_in=check_in,
                           communication=communication, location=location, value=value)


def recompute_listing_rating(db: Session, listing_id: int) -> None:
    """Refresh the listing's cached rating_avg/review_count from its reviews (the source of truth)."""
    db.flush()
    average, count = db.execute(
        select(func.avg(Review.rating), func.count(Review.id))
        .join(Booking, Booking.id == Review.booking_id)
        .where(Booking.listing_id == listing_id)
    ).one()
    listing = db.get(Listing, listing_id)
    listing.rating_avg = round(float(average), 2) if count else None
    listing.review_count = count


def create_review(db: Session, author: User, booking_id: int, body: ReviewCreate, today: date) -> ReviewOut:
    from app.services.bookings import load_booking  # local import avoids the cycle bookings → listings → reviews

    booking = load_booking(db, booking_id)
    if booking is None or booking.guest_id != author.id:
        raise not_found("Booking")
    if booking.status != "confirmed":
        raise AppError(409, "not_reviewable", "Cancelled stays can't be reviewed")
    if booking.check_out > today:
        raise AppError(409, "stay_not_finished", "You can review this stay after check-out")
    if booking.review is not None:
        raise AppError(409, "already_reviewed", "You've already reviewed this stay")

    review = Review(
        booking_id=booking.id, rating=body.rating, cleanliness_rating=body.cleanliness,
        accuracy_rating=body.accuracy, check_in_rating=body.check_in, communication_rating=body.communication,
        location_rating=body.location, value_rating=body.value, comment=body.comment,
    )
    db.add(review)
    recompute_listing_rating(db, booking.listing_id)
    try:
        db.commit()
    except IntegrityError as exc:  # UNIQUE(booking_id) — a concurrent duplicate submit
        db.rollback()
        raise AppError(409, "already_reviewed", "You've already reviewed this stay") from exc
    db.refresh(review)
    return to_review_out(review)
