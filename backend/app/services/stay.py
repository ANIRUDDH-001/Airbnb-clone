"""Rules for a stay: valid dates, party size, and availability (half-open [check_in, check_out) ranges)."""

from datetime import date

from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.models import Booking, Listing
from app.schemas.booking import StayIn
from app.services.pricing import PriceQuote, quote

MAX_NIGHTS = 90


def validate_stay(check_in: date, check_out: date, today: date) -> None:
    if check_in < today:
        raise AppError(422, "invalid_dates", "Check-in date can't be in the past")
    if check_out <= check_in:
        raise AppError(422, "invalid_dates", "Check-out must be after check-in")
    if (check_out - check_in).days > MAX_NIGHTS:
        raise AppError(422, "invalid_dates", f"Stays are limited to {MAX_NIGHTS} nights")


def overlaps(check_in: date, check_out: date):
    """SQL condition matching confirmed bookings whose range intersects [check_in, check_out)."""
    return and_(Booking.status == "confirmed", Booking.check_in < check_out, Booking.check_out > check_in)


def is_available(db: Session, listing_id: int, check_in: date, check_out: date) -> bool:
    conflict = select(Booking.id).where(Booking.listing_id == listing_id, overlaps(check_in, check_out))
    return not db.scalar(select(conflict.exists()))


def booked_ranges(db: Session, listing_id: int, start: date, end: date) -> list[tuple[date, date]]:
    rows = db.execute(
        select(Booking.check_in, Booking.check_out)
        .where(Booking.listing_id == listing_id, overlaps(start, end))
        .order_by(Booking.check_in)
    ).all()
    return [(row.check_in, row.check_out) for row in rows]


def quote_stay(db: Session, listing: Listing, stay: StayIn, today: date) -> PriceQuote:
    """Validate a proposed stay against every rule, then price it. Shared by /quote and POST /bookings."""
    validate_stay(stay.check_in, stay.check_out, today)
    if stay.adults + stay.children > listing.max_guests:
        raise AppError(422, "too_many_guests", f"This place has a maximum of {listing.max_guests} guests")
    if not is_available(db, listing.id, stay.check_in, stay.check_out):
        raise AppError(409, "dates_unavailable", "Those dates are not available")
    return quote(listing.nightly_price, listing.cleaning_fee, stay.check_in, stay.check_out)
