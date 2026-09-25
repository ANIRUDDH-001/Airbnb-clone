from datetime import datetime
from typing import TYPE_CHECKING, Literal, get_args

from sqlalchemy import CheckConstraint, Column, ForeignKey, Index, String, Table, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base

if TYPE_CHECKING:
    from app.models.user import User

PropertyType = Literal[
    "house", "flat", "guest_house", "hotel", "villa", "cabin", "cottage", "tiny_home", "farm_stay", "houseboat"
]
RoomType = Literal["entire_home", "private_room", "shared_room"]
PROPERTY_TYPES: tuple[str, ...] = get_args(PropertyType)
ROOM_TYPES: tuple[str, ...] = get_args(RoomType)


def _one_of(column: str, values: tuple[str, ...]) -> str:
    return f"{column} IN ({', '.join(repr(v) for v in values)})"


listing_amenities = Table(
    "listing_amenities",
    Base.metadata,
    Column("listing_id", ForeignKey("listings.id", ondelete="CASCADE"), primary_key=True),
    Column("amenity_id", ForeignKey("amenities.id", ondelete="RESTRICT"), primary_key=True),
)

listing_categories = Table(
    "listing_categories",
    Base.metadata,
    Column("listing_id", ForeignKey("listings.id", ondelete="CASCADE"), primary_key=True),
    Column("category_id", ForeignKey("categories.id", ondelete="RESTRICT"), primary_key=True),
)


class Amenity(Base):
    __tablename__ = "amenities"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(40), unique=True)
    name: Mapped[str] = mapped_column(String(80))
    icon: Mapped[str] = mapped_column(String(40))
    group_name: Mapped[str] = mapped_column(String(40))


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(40), unique=True)
    name: Mapped[str] = mapped_column(String(60))
    icon: Mapped[str] = mapped_column(String(40))
    position: Mapped[int] = mapped_column(default=0)


class Listing(Base):
    __tablename__ = "listings"
    __table_args__ = (
        CheckConstraint(_one_of("property_type", PROPERTY_TYPES), name="ck_listings_property_type"),
        CheckConstraint(_one_of("room_type", ROOM_TYPES), name="ck_listings_room_type"),
        CheckConstraint("max_guests BETWEEN 1 AND 16", name="ck_listings_max_guests"),
        CheckConstraint("bedrooms >= 0 AND beds >= 1 AND bathrooms >= 0", name="ck_listings_rooms"),
        CheckConstraint("nightly_price > 0", name="ck_listings_nightly_price"),
        CheckConstraint("cleaning_fee >= 0", name="ck_listings_cleaning_fee"),
        CheckConstraint("latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180", name="ck_listings_coords"),
        CheckConstraint("rating_avg IS NULL OR rating_avg BETWEEN 1 AND 5", name="ck_listings_rating_avg"),
        CheckConstraint("review_count >= 0", name="ck_listings_review_count"),
        Index("ix_listings_host_id", "host_id"),
        Index("ix_listings_city", "city"),
        Index("ix_listings_nightly_price", "nightly_price"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    host_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"))
    title: Mapped[str] = mapped_column(String(100))
    description: Mapped[str] = mapped_column(Text)
    property_type: Mapped[str] = mapped_column(String(20))
    room_type: Mapped[str] = mapped_column(String(20))
    max_guests: Mapped[int]
    bedrooms: Mapped[int]
    beds: Mapped[int]
    bathrooms: Mapped[int]
    nightly_price: Mapped[int]
    cleaning_fee: Mapped[int] = mapped_column(default=0)
    address: Mapped[str] = mapped_column(String(200))
    city: Mapped[str] = mapped_column(String(80))
    state: Mapped[str | None] = mapped_column(String(80))
    country: Mapped[str] = mapped_column(String(80))
    latitude: Mapped[float]
    longitude: Mapped[float]
    # Denormalised review cache, recomputed by services.reviews whenever a review is written.
    rating_avg: Mapped[float | None]
    review_count: Mapped[int] = mapped_column(default=0)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())
    deleted_at: Mapped[datetime | None]  # soft delete keeps past trips intact

    host: Mapped["User"] = relationship(back_populates="listings")
    photos: Mapped[list["ListingPhoto"]] = relationship(
        back_populates="listing", order_by="ListingPhoto.position", cascade="all, delete-orphan"
    )
    amenities: Mapped[list[Amenity]] = relationship(secondary=listing_amenities)
    categories: Mapped[list[Category]] = relationship(secondary=listing_categories)


class ListingPhoto(Base):
    __tablename__ = "listing_photos"
    __table_args__ = (UniqueConstraint("listing_id", "position", name="uq_listing_photos_position"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    listing_id: Mapped[int] = mapped_column(ForeignKey("listings.id", ondelete="CASCADE"))
    url: Mapped[str] = mapped_column(String(500))
    position: Mapped[int]  # 0 = cover photo

    listing: Mapped[Listing] = relationship(back_populates="photos")
