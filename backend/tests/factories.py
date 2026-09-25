import itertools
from datetime import date

from sqlalchemy.orm import Session

from app.models import Amenity, Booking, Category, Listing, ListingPhoto, Review, User

_seq = itertools.count(1)


def make_user(db: Session, **overrides) -> User:
    n = next(_seq)
    user = User(name=overrides.pop("name", f"User {n}"), email=overrides.pop("email", f"user{n}@example.com"), **overrides)
    db.add(user)
    db.commit()
    return user


def make_amenity(db: Session, code: str, **overrides) -> Amenity:
    amenity = Amenity(code=code, name=overrides.pop("name", code.replace("_", " ").title()),
                      icon=overrides.pop("icon", code), group_name=overrides.pop("group_name", "Essentials"), **overrides)
    db.add(amenity)
    db.commit()
    return amenity


def make_category(db: Session, slug: str, **overrides) -> Category:
    category = Category(slug=slug, name=overrides.pop("name", slug.replace("_", " ").title()),
                        icon=overrides.pop("icon", slug), position=overrides.pop("position", 0), **overrides)
    db.add(category)
    db.commit()
    return category


def make_listing(db: Session, host: User, *, photo_count: int = 3, amenities=(), categories=(), **overrides) -> Listing:
    n = next(_seq)
    fields = dict(
        title=f"Listing {n}", description="A lovely place to stay for a few nights.",
        property_type="flat", room_type="entire_home", max_guests=4, bedrooms=2, beds=2, bathrooms=1,
        nightly_price=2500, cleaning_fee=500, address=f"{n} Beach Road", city="Anjuna", state="Goa",
        country="India", latitude=15.58, longitude=73.74,
    )
    fields.update(overrides)
    listing = Listing(host_id=host.id, **fields)
    listing.photos = [ListingPhoto(url=f"https://images.example.com/{n}/{i}.jpg", position=i) for i in range(photo_count)]
    listing.amenities = list(amenities)
    listing.categories = list(categories)
    db.add(listing)
    db.commit()
    return listing


def make_booking(db: Session, listing: Listing, guest: User, check_in: date, check_out: date, **overrides) -> Booking:
    fields = dict(adults=2, children=0, infants=0, status="confirmed", nightly_price=listing.nightly_price,
                  nights=(check_out - check_in).days, cleaning_fee=listing.cleaning_fee, service_fee=0, taxes=0)
    fields.update(overrides)
    fields.setdefault("total", fields["nightly_price"] * fields["nights"] + fields["cleaning_fee"]
                      + fields["service_fee"] + fields["taxes"])
    booking = Booking(listing_id=listing.id, guest_id=guest.id, check_in=check_in, check_out=check_out, **fields)
    db.add(booking)
    db.commit()
    return booking


def make_review(db: Session, booking: Booking, rating: int = 5, **overrides) -> Review:
    review = Review(
        booking_id=booking.id, rating=rating, cleanliness_rating=rating, accuracy_rating=rating,
        check_in_rating=rating, communication_rating=rating, location_rating=rating, value_rating=rating,
        comment=overrides.pop("comment", "Wonderful stay, would come back."), **overrides,
    )
    db.add(review)
    db.commit()
    return review
