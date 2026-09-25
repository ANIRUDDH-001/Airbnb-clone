from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models import PropertyType, RoomType

SortOption = Literal["recommended", "price_asc", "price_desc", "rating"]


class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    slug: str
    name: str
    icon: str


class AmenityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    code: str
    name: str
    icon: str
    group_name: str


class DestinationOut(BaseModel):
    name: str
    state: str
    country: str
    latitude: float
    longitude: float
    blurb: str


class StayPrice(BaseModel):
    nights: int
    total: int  # all fees included, as the live site shows


class ListingCard(BaseModel):
    id: int
    title: str
    property_type: str
    room_type: str
    city: str
    state: str | None
    country: str
    latitude: float
    longitude: float
    bedrooms: int
    beds: int
    bathrooms: int
    max_guests: int
    nightly_price: int
    rating_avg: float | None
    review_count: int
    is_guest_favourite: bool
    photos: list[str]
    stay_price: StayPrice | None
    is_wishlisted: bool


class ListingSearchParams(BaseModel):
    model_config = ConfigDict(extra="forbid")

    location: str | None = Field(default=None, max_length=100)
    check_in: date | None = None
    check_out: date | None = None
    guests: int = Field(default=1, ge=1, le=16)
    category: str | None = Field(default=None, max_length=40)
    min_price: int | None = Field(default=None, ge=0)
    max_price: int | None = Field(default=None, ge=0)
    room_type: RoomType | None = None
    property_types: list[PropertyType] = Field(default_factory=list)
    amenities: list[str] = Field(default_factory=list)
    min_bedrooms: int = Field(default=0, ge=0, le=50)
    min_beds: int = Field(default=0, ge=0, le=50)
    min_bathrooms: int = Field(default=0, ge=0, le=50)
    sort: SortOption = "recommended"
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=24, ge=1, le=60)
