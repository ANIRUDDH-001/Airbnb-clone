from datetime import date, datetime, timezone

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.core.errors import AppError, not_found
from app.models import Booking, Listing, User
from app.schemas.booking import BookingCreate, BookingListing, BookingOut
from app.schemas.user import PersonSummary
from app.services.listings import get_active_listing
from app.services.stay import quote_stay

BOOKING_LOAD = (
    selectinload(Booking.listing).selectinload(Listing.photos),
    selectinload(Booking.listing).selectinload(Listing.host),
    selectinload(Booking.guest),
    selectinload(Booking.review),
)


def _person(user: User) -> PersonSummary:
    return PersonSummary(id=user.id, name=user.name, avatar_url=user.avatar_url)


def phase_of(booking: Booking, today: date) -> str:
    if booking.status == "cancelled":
        return "cancelled"
    return "upcoming" if booking.check_out > today else "past"


def _can_cancel(booking: Booking, today: date) -> bool:
    return booking.status == "confirmed" and booking.check_in > today


def to_booking_out(booking: Booking, today: date, viewer: User) -> BookingOut:
    listing = booking.listing
    phase = phase_of(booking, today)
    return BookingOut(
        id=booking.id, check_in=booking.check_in, check_out=booking.check_out, adults=booking.adults,
        children=booking.children, infants=booking.infants, status=booking.status, phase=phase,
        nightly_price=booking.nightly_price, nights=booking.nights, subtotal=booking.nightly_price * booking.nights,
        cleaning_fee=booking.cleaning_fee, service_fee=booking.service_fee, taxes=booking.taxes, total=booking.total,
        created_at=booking.created_at, cancelled_at=booking.cancelled_at,
        listing=BookingListing(
            id=listing.id, title=listing.title, property_type=listing.property_type, room_type=listing.room_type,
            city=listing.city, state=listing.state, country=listing.country,
            photo_url=listing.photos[0].url if listing.photos else None, host=_person(listing.host),
        ),
        guest=_person(booking.guest),
        can_cancel=_can_cancel(booking, today),
        can_review=phase == "past" and booking.review is None and viewer.id == booking.guest_id,
        has_review=booking.review is not None,
    )


def load_booking(db: Session, booking_id: int) -> Booking | None:
    return db.scalar(select(Booking).where(Booking.id == booking_id).options(*BOOKING_LOAD))


def create_booking(db: Session, guest: User, body: BookingCreate, today: date) -> BookingOut:
    listing = get_active_listing(db, body.listing_id)
    if listing.host_id == guest.id:
        raise AppError(403, "own_listing", "You can't book your own listing")
    price = quote_stay(db, listing, body, today)
    booking = Booking(
        listing_id=listing.id, guest_id=guest.id, check_in=body.check_in, check_out=body.check_out,
        adults=body.adults, children=body.children, infants=body.infants, status="confirmed",
        nightly_price=price.nightly_price, nights=price.nights, cleaning_fee=price.cleaning_fee,
        service_fee=price.service_fee, taxes=price.taxes, total=price.total,
    )
    db.add(booking)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        if "booking_overlap" in str(exc.orig):  # another request won the race (database trigger)
            raise AppError(409, "dates_unavailable", "Those dates were just booked by someone else") from exc
        raise
    return to_booking_out(load_booking(db, booking.id), today, guest)


def list_trips(db: Session, guest: User, today: date, phase: str | None) -> list[BookingOut]:
    rows = db.scalars(
        select(Booking).where(Booking.guest_id == guest.id).options(*BOOKING_LOAD).order_by(Booking.check_in, Booking.id)
    ).all()
    trips = [to_booking_out(booking, today, guest) for booking in rows]
    return [trip for trip in trips if phase is None or trip.phase == phase]


def _visible_booking(db: Session, user: User, booking_id: int) -> Booking:
    booking = load_booking(db, booking_id)
    if booking is None or user.id not in (booking.guest_id, booking.listing.host_id):
        raise not_found("Booking")  # 404 rather than 403: don't reveal other people's bookings
    return booking


def get_booking_for(db: Session, user: User, booking_id: int, today: date) -> BookingOut:
    return to_booking_out(_visible_booking(db, user, booking_id), today, user)


def cancel_booking(db: Session, user: User, booking_id: int, today: date) -> BookingOut:
    booking = _visible_booking(db, user, booking_id)
    if not _can_cancel(booking, today):
        raise AppError(409, "cannot_cancel", "Only upcoming stays that haven't started can be cancelled")
    booking.status = "cancelled"
    booking.cancelled_at = datetime.now(timezone.utc)
    db.commit()
    return to_booking_out(booking, today, user)
