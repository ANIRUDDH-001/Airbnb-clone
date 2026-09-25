from fastapi import APIRouter

from app.core.auth import CurrentUser
from app.core.clock import Today
from app.core.db import DbSession
from app.schemas.booking import BookingCreate, BookingOut, BookingPhase
from app.schemas.review import ReviewCreate, ReviewOut
from app.services import bookings as bookings_service
from app.services import reviews as reviews_service

router = APIRouter(prefix="/bookings", tags=["bookings"])


@router.post("", response_model=BookingOut, status_code=201)
def create_booking(body: BookingCreate, user: CurrentUser, db: DbSession, today: Today):
    return bookings_service.create_booking(db, user, body, today)


@router.get("/mine", response_model=list[BookingOut])
def my_trips(user: CurrentUser, db: DbSession, today: Today, phase: BookingPhase | None = None):
    return bookings_service.list_trips(db, user, today, phase)


@router.get("/{booking_id}", response_model=BookingOut)
def get_booking(booking_id: int, user: CurrentUser, db: DbSession, today: Today):
    return bookings_service.get_booking_for(db, user, booking_id, today)


@router.post("/{booking_id}/cancel", response_model=BookingOut)
def cancel_booking(booking_id: int, user: CurrentUser, db: DbSession, today: Today):
    return bookings_service.cancel_booking(db, user, booking_id, today)


@router.post("/{booking_id}/review", response_model=ReviewOut, status_code=201)
def review_stay(booking_id: int, body: ReviewCreate, user: CurrentUser, db: DbSession, today: Today):
    return reviews_service.create_review(db, user, booking_id, body, today)
