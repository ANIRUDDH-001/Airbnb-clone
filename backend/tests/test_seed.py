from sqlalchemy import func, select

from app.models import Booking, Listing, Review, User, WishlistItem
from app.seed.data import DEMO_GUEST_EMAIL, DEMO_HOST_EMAIL
from app.seed.photos import EXTERIOR, INTERIOR
from app.seed.run import seed, seed_if_empty
from app.services.bookings import phase_of
from tests.conftest import TODAY


def test_photo_pools_are_well_formed():
    urls = [u for pool in (*EXTERIOR.values(), *INTERIOR.values()) for u in pool]
    assert all(u.startswith("https://images.unsplash.com/photo-") for u in urls)
    assert len(urls) == len(set(urls))
    assert all(len(p) >= 6 for p in EXTERIOR.values()) and all(len(p) >= 12 for p in INTERIOR.values())


def test_seed_builds_a_usable_demo_world(db):
    seed(db, TODAY)
    listings = db.scalars(select(Listing)).all()
    assert len(listings) == 48
    assert all(len(l.photos) == 5 and 5 <= len(l.amenities) <= 12 and l.categories for l in listings)

    host = db.scalar(select(User).where(User.email == DEMO_HOST_EMAIL))
    assert host.is_superhost and sum(1 for l in listings if l.host_id == host.id) == 8
    host_upcoming = db.scalar(select(func.count(Booking.id)).join(Listing).where(
        Listing.host_id == host.id, Booking.status == "confirmed", Booking.check_out > TODAY))
    assert host_upcoming >= 3

    guest = db.scalar(select(User).where(User.email == DEMO_GUEST_EMAIL))
    trips = db.scalars(select(Booking).where(Booking.guest_id == guest.id)).all()
    phases = [phase_of(b, TODAY) for b in trips]
    assert phases.count("upcoming") == 2 and phases.count("past") == 2 and phases.count("cancelled") == 1
    assert sum(1 for b in trips if phase_of(b, TODAY) == "past" and b.review is None) == 1
    assert db.scalar(select(func.count()).select_from(WishlistItem).where(WishlistItem.user_id == guest.id)) == 3

    assert db.scalar(select(func.count(Review.id))) >= 100


def test_seed_cached_ratings_match_reviews(db):
    seed(db, TODAY)
    for listing in db.scalars(select(Listing)).all():
        count = db.scalar(select(func.count(Review.id)).join(Booking).where(Booking.listing_id == listing.id))
        assert listing.review_count == count


def test_seed_prices_follow_pricing_rules(db):
    seed(db, TODAY)
    for b in db.scalars(select(Booking)).all():
        assert b.total == b.nightly_price * b.nights + b.cleaning_fee + b.service_fee + b.taxes
        assert b.nights == (b.check_out - b.check_in).days


def test_seed_if_empty_runs_once(db):
    assert seed_if_empty(db, TODAY) is True
    assert seed_if_empty(db, TODAY) is False
    assert db.scalar(select(func.count(Listing.id))) == 48
