from datetime import date

import pytest
from sqlalchemy import inspect
from sqlalchemy.exc import IntegrityError

from app.models import Listing
from tests.factories import make_booking, make_listing, make_review, make_user

D = date  # shorthand


@pytest.fixture
def stay_setup(db):
    host, guest = make_user(db), make_user(db)
    return make_listing(db, host), guest


def test_all_tables_exist(db):
    assert set(inspect(db.get_bind()).get_table_names()) == {
        "users", "listings", "listing_photos", "amenities", "listing_amenities", "categories",
        "listing_categories", "bookings", "reviews", "wishlist_items",
    }


def test_booking_requires_checkout_after_checkin(db, stay_setup):
    listing, guest = stay_setup
    with pytest.raises(IntegrityError):
        make_booking(db, listing, guest, D(2026, 2, 1), D(2026, 2, 1))
    db.rollback()


def test_booking_total_must_match_its_parts(db, stay_setup):
    listing, guest = stay_setup
    with pytest.raises(IntegrityError):
        make_booking(db, listing, guest, D(2026, 2, 1), D(2026, 2, 3), total=1)
    db.rollback()


def test_trigger_blocks_overlapping_confirmed_booking(db, stay_setup):
    listing, guest = stay_setup
    make_booking(db, listing, guest, D(2026, 2, 1), D(2026, 2, 5))
    with pytest.raises(IntegrityError, match="booking_overlap"):
        make_booking(db, listing, guest, D(2026, 2, 4), D(2026, 2, 6))
    db.rollback()


def test_back_to_back_bookings_allowed(db, stay_setup):
    listing, guest = stay_setup
    make_booking(db, listing, guest, D(2026, 2, 1), D(2026, 2, 5))
    make_booking(db, listing, guest, D(2026, 2, 5), D(2026, 2, 8))  # check-in on the previous check-out day


def test_trigger_ignores_cancelled_bookings(db, stay_setup):
    listing, guest = stay_setup
    make_booking(db, listing, guest, D(2026, 2, 1), D(2026, 2, 5), status="cancelled")
    make_booking(db, listing, guest, D(2026, 2, 2), D(2026, 2, 4))


def test_trigger_is_scoped_to_one_listing(db, stay_setup):
    listing, guest = stay_setup
    other = make_listing(db, listing.host)
    make_booking(db, listing, guest, D(2026, 2, 1), D(2026, 2, 5))
    make_booking(db, other, guest, D(2026, 2, 1), D(2026, 2, 5))


def test_foreign_keys_are_enforced(db):
    listing = Listing(host_id=9999, title="x", description="x", property_type="flat", room_type="entire_home",
                      max_guests=1, bedrooms=1, beds=1, bathrooms=1, nightly_price=100, cleaning_fee=0,
                      address="x", city="x", country="x", latitude=0, longitude=0)
    db.add(listing)
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()


def test_listing_rejects_unknown_property_type(db):
    host = make_user(db)
    with pytest.raises(IntegrityError):
        make_listing(db, host, property_type="castle")
    db.rollback()


def test_one_review_per_booking(db, stay_setup):
    listing, guest = stay_setup
    booking = make_booking(db, listing, guest, D(2026, 1, 1), D(2026, 1, 3))
    make_review(db, booking)
    with pytest.raises(IntegrityError):
        make_review(db, booking)
    db.rollback()
