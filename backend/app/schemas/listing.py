from datetime import date
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

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


class HostSummary(BaseModel):
    id: int
    name: str
    avatar_url: str | None
    bio: str | None
    is_superhost: bool
    hosting_since: date
    listing_count: int
    review_count: int
    rating_avg: float | None


class RatingBreakdown(BaseModel):
    cleanliness: float
    accuracy: float
    check_in: float
    communication: float
    location: float
    value: float


class ListingDetail(BaseModel):
    id: int
    title: str
    description: str
    property_type: str
    room_type: str
    max_guests: int
    bedrooms: int
    beds: int
    bathrooms: int
    nightly_price: int
    cleaning_fee: int
    address: str
    city: str
    state: str | None
    country: str
    latitude: float
    longitude: float
    rating_avg: float | None
    review_count: int
    is_guest_favourite: bool
    photos: list[str]
    amenities: list[AmenityOut]
    categories: list[CategoryOut]
    host: HostSummary
    rating_breakdown: RatingBreakdown | None
    is_wishlisted: bool


PhotoUrl = Annotated[str, StringConstraints(strip_whitespace=True, pattern=r"^https?://\S+$", max_length=500)]


class ListingWrite(BaseModel):
    """Everything a host edits. PUT replaces all of it, including photos, amenities and categories."""

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    title: str = Field(min_length=5, max_length=100)
    description: str = Field(min_length=20, max_length=5000)
    property_type: PropertyType
    room_type: RoomType
    max_guests: int = Field(ge=1, le=16)
    bedrooms: int = Field(ge=0, le=50)
    beds: int = Field(ge=1, le=50)
    bathrooms: int = Field(ge=0, le=50)
    nightly_price: int = Field(ge=100, le=1_000_000)
    cleaning_fee: int = Field(default=0, ge=0, le=100_000)
    address: str = Field(min_length=3, max_length=200)
    city: str = Field(min_length=1, max_length=80)
    state: str | None = Field(default=None, max_length=80)
    country: str = Field(min_length=2, max_length=80)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    photo_urls: list[PhotoUrl] = Field(min_length=1, max_length=20)
    amenity_codes: list[str] = Field(default_factory=list, max_length=60)
    category_slugs: list[str] = Field(default_factory=list, max_length=10)


class HostListingOut(ListingCard):
    upcoming_reservations: int
