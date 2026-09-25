from dataclasses import asdict
from datetime import date, timedelta
from typing import Annotated

from fastapi import APIRouter, Query

from app.core.auth import OptionalUser
from app.core.clock import Today
from app.core.db import DbSession
from app.core.errors import AppError
from app.schemas.booking import AvailabilityOut, DateRange, PriceQuoteOut, StayIn
from app.schemas.common import Page
from app.schemas.listing import ListingCard, ListingDetail, ListingSearchParams
from app.schemas.review import ReviewOut
from app.services import listings as listings_service
from app.services import reviews as reviews_service
from app.services.stay import booked_ranges, quote_stay

router = APIRouter(prefix="/listings", tags=["listings"])

MAX_AVAILABILITY_WINDOW_DAYS = 400


@router.get("", response_model=Page[ListingCard])
def search_listings(params: Annotated[ListingSearchParams, Query()], db: DbSession, viewer: OptionalUser, today: Today):
    return listings_service.search_listings(db, params, today, viewer)


@router.get("/{listing_id}", response_model=ListingDetail)
def get_listing(listing_id: int, db: DbSession, viewer: OptionalUser):
    return listings_service.get_listing_detail(db, listing_id, viewer)


@router.get("/{listing_id}/availability", response_model=AvailabilityOut)
def get_availability(listing_id: int, db: DbSession, today: Today, start: date | None = None, end: date | None = None):
    listing = listings_service.get_active_listing(db, listing_id)
    start = start or today
    end = end or today + timedelta(days=365)
    if end <= start or (end - start).days > MAX_AVAILABILITY_WINDOW_DAYS:
        raise AppError(422, "invalid_window", f"end must be after start and within {MAX_AVAILABILITY_WINDOW_DAYS} days")
    ranges = booked_ranges(db, listing.id, start, end)
    return AvailabilityOut(listing_id=listing.id, start=start, end=end,
                           booked=[DateRange(check_in=a, check_out=b) for a, b in ranges])


@router.get("/{listing_id}/quote", response_model=PriceQuoteOut)
def get_quote(listing_id: int, stay: Annotated[StayIn, Query()], db: DbSession, today: Today):
    listing = listings_service.get_active_listing(db, listing_id)
    return PriceQuoteOut(**asdict(quote_stay(db, listing, stay, today)))


@router.get("/{listing_id}/reviews", response_model=Page[ReviewOut])
def get_reviews(listing_id: int, db: DbSession,
                page: Annotated[int, Query(ge=1)] = 1, page_size: Annotated[int, Query(ge=1, le=50)] = 10):
    listings_service.get_active_listing(db, listing_id)
    return reviews_service.list_reviews(db, listing_id, page, page_size)
