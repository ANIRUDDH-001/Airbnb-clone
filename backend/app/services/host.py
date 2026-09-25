from datetime import date, datetime, timezone

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session, selectinload

from app.core.errors import AppError, not_found
from app.models import Amenity, Booking, Category, Listing, ListingPhoto, User, WishlistItem
from app.schemas.booking import BookingOut
from app.schemas.listing import HostListingOut, ListingDetail, ListingWrite
from app.services.bookings import BOOKING_LOAD, to_booking_out
from app.services.listings import cards_for, get_listing_detail

SCALAR_FIELDS = (
    "title", "description", "property_type", "room_type", "max_guests", "bedrooms", "beds", "bathrooms",
    "nightly_price", "cleaning_fee", "address", "city", "state", "country", "latitude", "longitude",
)


def get_owned_listing(db: Session, host: User, listing_id: int) -> Listing:
    listing = db.get(Listing, listing_id)
    if listing is None or listing.deleted_at is not None:
        raise not_found("Listing")
    if listing.host_id != host.id:
        raise AppError(403, "not_owner", "You can only manage your own listings")
    return listing


def _lookup(db: Session, model, key_column, keys: list[str], code: str, label: str) -> list:
    wanted = set(keys)
    rows = db.scalars(select(model).where(key_column.in_(wanted))).all()
    missing = wanted - {getattr(row, key_column.key) for row in rows}
    if missing:
        raise AppError(422, code, f"Unknown {label}: {', '.join(sorted(missing))}")
    return list(rows)


def _apply(db: Session, listing: Listing, body: ListingWrite) -> None:
    for field in SCALAR_FIELDS:
        setattr(listing, field, getattr(body, field))
    listing.amenities = _lookup(db, Amenity, Amenity.code, body.amenity_codes, "unknown_amenity", "amenity")
    listing.categories = _lookup(db, Category, Category.slug, body.category_slugs, "unknown_category", "category")
    if listing.photos:
        # Delete the old rows first so UNIQUE(listing_id, position) isn't hit by the new ones.
        listing.photos.clear()
        db.flush()
    listing.photos = [ListingPhoto(url=url, position=i) for i, url in enumerate(body.photo_urls)]


def create_listing(db: Session, host: User, body: ListingWrite) -> ListingDetail:
    listing = Listing(host_id=host.id)
    _apply(db, listing, body)
    db.add(listing)
    db.commit()
    return get_listing_detail(db, listing.id, host)


def update_listing(db: Session, host: User, listing_id: int, body: ListingWrite) -> ListingDetail:
    listing = get_owned_listing(db, host, listing_id)
    _apply(db, listing, body)
    db.commit()
    return get_listing_detail(db, listing.id, host)


def delete_listing(db: Session, host: User, listing_id: int, today: date) -> None:
    listing = get_owned_listing(db, host, listing_id)
    upcoming = db.scalar(
        select(func.count(Booking.id)).where(
            Booking.listing_id == listing.id, Booking.status == "confirmed", Booking.check_out > today
        )
    )
    if upcoming:
        raise AppError(409, "has_upcoming_bookings",
                       f"This listing has {upcoming} upcoming reservation(s). Cancel them before deleting it.")
    listing.deleted_at = datetime.now(timezone.utc)  # soft delete: past trips keep their listing
    db.execute(delete(WishlistItem).where(WishlistItem.listing_id == listing.id))
    db.commit()


def host_listings(db: Session, host: User, today: date) -> list[HostListingOut]:
    rows = db.scalars(
        select(Listing)
        .where(Listing.host_id == host.id, Listing.deleted_at.is_(None))
        .order_by(Listing.created_at.desc(), Listing.id.desc())
        .options(selectinload(Listing.photos))
    ).all()
    upcoming = dict(db.execute(
        select(Booking.listing_id, func.count(Booking.id))
        .where(Booking.listing_id.in_([l.id for l in rows]), Booking.status == "confirmed", Booking.check_out > today)
        .group_by(Booking.listing_id)
    ).all())
    return [HostListingOut(**card.model_dump(), upcoming_reservations=upcoming.get(card.id, 0))
            for card in cards_for(db, rows, host)]


def host_reservations(db: Session, host: User, today: date, phase: str | None) -> list[BookingOut]:
    rows = db.scalars(
        select(Booking)
        .join(Listing, Listing.id == Booking.listing_id)
        .where(Listing.host_id == host.id)  # includes soft-deleted listings: history stays visible
        .options(*BOOKING_LOAD)
        .order_by(Booking.check_in, Booking.id)
    ).all()
    reservations = [to_booking_out(booking, today, host) for booking in rows]
    return [r for r in reservations if phase is None or r.phase == phase]
