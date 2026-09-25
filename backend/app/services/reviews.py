from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models import Booking, Review
from app.schemas.common import Page
from app.schemas.listing import RatingBreakdown
from app.schemas.review import ReviewOut


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
