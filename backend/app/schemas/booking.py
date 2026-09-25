from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import UtcDateTime
from app.schemas.user import PersonSummary

BookingPhase = Literal["upcoming", "past", "cancelled"]


class StayIn(BaseModel):
    """Dates and party size for a quote or a booking. Infants don't count towards max_guests."""

    check_in: date
    check_out: date
    adults: int = Field(default=1, ge=1, le=16)
    children: int = Field(default=0, ge=0, le=15)
    infants: int = Field(default=0, ge=0, le=5)


class BookingCreate(StayIn):
    model_config = ConfigDict(extra="forbid")  # the client can't smuggle in a price
    listing_id: int


class PriceQuoteOut(BaseModel):
    nightly_price: int
    nights: int
    subtotal: int
    cleaning_fee: int
    service_fee: int
    taxes: int
    total: int


class DateRange(BaseModel):
    check_in: date
    check_out: date


class AvailabilityOut(BaseModel):
    listing_id: int
    start: date
    end: date
    booked: list[DateRange]


class BookingListing(BaseModel):
    id: int
    title: str
    property_type: str
    room_type: str
    city: str
    state: str | None
    country: str
    photo_url: str | None
    host: PersonSummary


class BookingOut(BaseModel):
    id: int
    check_in: date
    check_out: date
    adults: int
    children: int
    infants: int
    status: str
    phase: BookingPhase
    nightly_price: int
    nights: int
    subtotal: int
    cleaning_fee: int
    service_fee: int
    taxes: int
    total: int
    created_at: UtcDateTime
    cancelled_at: UtcDateTime | None
    listing: BookingListing
    guest: PersonSummary
    can_cancel: bool
    can_review: bool
    has_review: bool
