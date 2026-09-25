from fastapi import APIRouter, Response

from app.core.auth import CurrentUser
from app.core.clock import Today
from app.core.db import DbSession
from app.schemas.booking import BookingOut, BookingPhase
from app.schemas.listing import HostListingOut, ListingDetail, ListingWrite
from app.services import host as host_service

router = APIRouter(prefix="/host", tags=["host"])


@router.get("/listings", response_model=list[HostListingOut])
def my_listings(user: CurrentUser, db: DbSession, today: Today):
    return host_service.host_listings(db, user, today)


@router.post("/listings", response_model=ListingDetail, status_code=201)
def create_listing(body: ListingWrite, user: CurrentUser, db: DbSession):
    return host_service.create_listing(db, user, body)


@router.put("/listings/{listing_id}", response_model=ListingDetail)
def update_listing(listing_id: int, body: ListingWrite, user: CurrentUser, db: DbSession):
    return host_service.update_listing(db, user, listing_id, body)


@router.delete("/listings/{listing_id}", status_code=204)
def delete_listing(listing_id: int, user: CurrentUser, db: DbSession, today: Today) -> Response:
    host_service.delete_listing(db, user, listing_id, today)
    return Response(status_code=204)


@router.get("/reservations", response_model=list[BookingOut])
def reservations(user: CurrentUser, db: DbSession, today: Today, phase: BookingPhase | None = None):
    return host_service.host_reservations(db, user, today, phase)
