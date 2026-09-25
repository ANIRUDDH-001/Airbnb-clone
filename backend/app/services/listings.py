from collections.abc import Sequence
from datetime import date

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.core.errors import AppError, not_found
from app.models import Amenity, Booking, Category, Listing, User, WishlistItem, listing_amenities
from app.schemas.common import Page
from app.schemas.listing import (
    AmenityOut, CategoryOut, HostSummary, ListingCard, ListingDetail, ListingSearchParams, StayPrice,
)
from app.services.pricing import quote
from app.services.reviews import rating_breakdown
from app.services.stay import overlaps, validate_stay

GUEST_FAVOURITE_MIN_RATING = 4.8
GUEST_FAVOURITE_MIN_REVIEWS = 3
CARD_PHOTO_LIMIT = 5

SORT_ORDERS = {
    "recommended": (Listing.rating_avg.desc().nulls_last(), Listing.review_count.desc(), Listing.id),
    "price_asc": (Listing.nightly_price.asc(), Listing.id),
    "price_desc": (Listing.nightly_price.desc(), Listing.id),
    "rating": (Listing.rating_avg.desc().nulls_last(), Listing.id),
}


def get_active_listing(db: Session, listing_id: int) -> Listing:
    listing = db.get(Listing, listing_id)
    if listing is None or listing.deleted_at is not None:
        raise not_found("Listing")
    return listing


def is_guest_favourite(listing: Listing) -> bool:
    return (listing.rating_avg or 0) >= GUEST_FAVOURITE_MIN_RATING and listing.review_count >= GUEST_FAVOURITE_MIN_REVIEWS


def wishlisted_ids(db: Session, viewer: User | None, listing_ids: Sequence[int]) -> set[int]:
    if viewer is None or not listing_ids:
        return set()
    return set(db.scalars(
        select(WishlistItem.listing_id).where(WishlistItem.user_id == viewer.id, WishlistItem.listing_id.in_(listing_ids))
    ))


def cards_for(db: Session, listings: Sequence[Listing], viewer: User | None,
              stay: tuple[date, date] | None = None) -> list[ListingCard]:
    saved = wishlisted_ids(db, viewer, [listing.id for listing in listings])
    cards = []
    for listing in listings:
        stay_price = None
        if stay is not None:
            price = quote(listing.nightly_price, listing.cleaning_fee, *stay)
            stay_price = StayPrice(nights=price.nights, total=price.total)
        cards.append(ListingCard(
            id=listing.id, title=listing.title, property_type=listing.property_type, room_type=listing.room_type,
            city=listing.city, state=listing.state, country=listing.country, latitude=listing.latitude,
            longitude=listing.longitude, bedrooms=listing.bedrooms, beds=listing.beds, bathrooms=listing.bathrooms,
            max_guests=listing.max_guests, nightly_price=listing.nightly_price, rating_avg=listing.rating_avg,
            review_count=listing.review_count, is_guest_favourite=is_guest_favourite(listing),
            photos=[photo.url for photo in listing.photos[:CARD_PHOTO_LIMIT]], stay_price=stay_price,
            is_wishlisted=listing.id in saved,
        ))
    return cards


def _requested_stay(params: ListingSearchParams, today: date) -> tuple[date, date] | None:
    if params.check_in is None and params.check_out is None:
        return None
    if params.check_in is None or params.check_out is None:
        raise AppError(422, "invalid_dates", "Provide both check-in and check-out dates")
    validate_stay(params.check_in, params.check_out, today)
    return params.check_in, params.check_out


def _conditions(params: ListingSearchParams, stay: tuple[date, date] | None) -> list:
    if params.min_price is not None and params.max_price is not None and params.min_price > params.max_price:
        raise AppError(422, "invalid_price_range", "Minimum price can't be above maximum price")

    conditions = [Listing.deleted_at.is_(None), Listing.max_guests >= params.guests]
    if params.location and params.location.strip():
        # "Goa, India" → match on "Goa"; the first part is the most specific.
        term = params.location.split(",")[0].strip()
        conditions.append(or_(
            Listing.city.icontains(term, autoescape=True),
            Listing.state.icontains(term, autoescape=True),
            Listing.country.icontains(term, autoescape=True),
        ))
    if params.category:
        conditions.append(Listing.categories.any(Category.slug == params.category))
    if params.min_price is not None:
        conditions.append(Listing.nightly_price >= params.min_price)
    if params.max_price is not None:
        conditions.append(Listing.nightly_price <= params.max_price)
    if params.room_type:
        conditions.append(Listing.room_type == params.room_type)
    if params.property_types:
        conditions.append(Listing.property_type.in_(params.property_types))
    if params.min_bedrooms:
        conditions.append(Listing.bedrooms >= params.min_bedrooms)
    if params.min_beds:
        conditions.append(Listing.beds >= params.min_beds)
    if params.min_bathrooms:
        conditions.append(Listing.bathrooms >= params.min_bathrooms)
    if params.amenities:
        codes = set(params.amenities)
        has_all_amenities = (
            select(listing_amenities.c.listing_id)
            .join(Amenity, Amenity.id == listing_amenities.c.amenity_id)
            .where(Amenity.code.in_(codes))
            .group_by(listing_amenities.c.listing_id)
            .having(func.count() == len(codes))
        )
        conditions.append(Listing.id.in_(has_all_amenities))
    if stay is not None:
        clash = select(Booking.id).where(Booking.listing_id == Listing.id, overlaps(*stay))
        conditions.append(~clash.exists())
    return conditions


def search_listings(db: Session, params: ListingSearchParams, today: date, viewer: User | None) -> Page[ListingCard]:
    stay = _requested_stay(params, today)
    conditions = _conditions(params, stay)
    total = db.scalar(select(func.count(Listing.id)).where(*conditions)) or 0
    rows = db.scalars(
        select(Listing)
        .where(*conditions)
        .order_by(*SORT_ORDERS[params.sort])
        .offset((params.page - 1) * params.page_size)
        .limit(params.page_size)
        .options(selectinload(Listing.photos))
    ).all()
    return Page[ListingCard](
        items=cards_for(db, rows, viewer, stay), page=params.page, page_size=params.page_size,
        total=total, has_more=params.page * params.page_size < total,
    )


def _host_summary(db: Session, host: User) -> HostSummary:
    listing_count, review_count, weighted = db.execute(
        select(func.count(Listing.id), func.coalesce(func.sum(Listing.review_count), 0),
               func.sum(Listing.rating_avg * Listing.review_count))
        .where(Listing.host_id == host.id, Listing.deleted_at.is_(None))
    ).one()
    return HostSummary(
        id=host.id, name=host.name, avatar_url=host.avatar_url, bio=host.bio, is_superhost=host.is_superhost,
        hosting_since=host.created_at.date(), listing_count=listing_count, review_count=review_count,
        rating_avg=round(weighted / review_count, 2) if review_count else None,
    )


def get_listing_detail(db: Session, listing_id: int, viewer: User | None) -> ListingDetail:
    listing = get_active_listing(db, listing_id)
    return ListingDetail(
        id=listing.id, title=listing.title, description=listing.description, property_type=listing.property_type,
        room_type=listing.room_type, max_guests=listing.max_guests, bedrooms=listing.bedrooms, beds=listing.beds,
        bathrooms=listing.bathrooms, nightly_price=listing.nightly_price, cleaning_fee=listing.cleaning_fee,
        address=listing.address, city=listing.city, state=listing.state, country=listing.country,
        latitude=listing.latitude, longitude=listing.longitude, rating_avg=listing.rating_avg,
        review_count=listing.review_count, is_guest_favourite=is_guest_favourite(listing),
        photos=[photo.url for photo in listing.photos],
        amenities=[AmenityOut.model_validate(a) for a in sorted(listing.amenities, key=lambda a: (a.group_name, a.name))],
        categories=[CategoryOut.model_validate(c) for c in listing.categories],
        host=_host_summary(db, listing.host), rating_breakdown=rating_breakdown(db, listing.id),
        is_wishlisted=listing.id in wishlisted_ids(db, viewer, [listing.id]),
    )
