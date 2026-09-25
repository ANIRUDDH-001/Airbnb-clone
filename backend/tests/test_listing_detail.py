from datetime import date, datetime

import pytest

from tests.factories import make_amenity, make_booking, make_category, make_listing, make_review, make_user

D = date


@pytest.fixture
def listing(db):
    host = make_user(db, name="Rahul Mehta", is_superhost=True, bio="Architect turned host.")
    guest = make_user(db, name="Neha Gupta")
    listing = make_listing(db, host, title="Sunlit villa", photo_count=5,
                           amenities=[make_amenity(db, "wifi")], categories=[make_category(db, "beachfront")])
    past = make_booking(db, listing, guest, D(2025, 12, 1), D(2025, 12, 4))
    make_review(db, past, rating=4, comment="Lovely place and a very kind host.")
    listing.rating_avg, listing.review_count = 4.0, 1
    db.commit()
    make_booking(db, listing, guest, D(2026, 2, 10), D(2026, 2, 14))
    return listing


def test_detail_returns_everything_the_page_needs(client, listing):
    body = client.get(f"/api/listings/{listing.id}").json()
    assert body["title"] == "Sunlit villa" and len(body["photos"]) == 5
    assert body["amenities"] == [{"code": "wifi", "name": "Wifi", "icon": "wifi", "group_name": "Essentials"}]
    assert body["categories"] == [{"slug": "beachfront", "name": "Beachfront", "icon": "beachfront"}]
    assert body["host"]["name"] == "Rahul Mehta" and body["host"]["is_superhost"] is True
    assert body["host"]["listing_count"] == 1 and body["host"]["review_count"] == 1 and body["host"]["rating_avg"] == 4.0
    assert body["rating_breakdown"] == {"cleanliness": 4.0, "accuracy": 4.0, "check_in": 4.0,
                                        "communication": 4.0, "location": 4.0, "value": 4.0}
    assert body["is_wishlisted"] is False and body["cleaning_fee"] == 500


def test_detail_of_deleted_listing_is_404(client, db, listing):
    listing.deleted_at = datetime(2026, 1, 1)
    db.commit()
    assert client.get(f"/api/listings/{listing.id}").status_code == 404


def test_detail_of_missing_listing_is_404(client):
    response = client.get("/api/listings/999")
    assert response.status_code == 404 and response.json()["error"]["code"] == "not_found"


def test_availability_lists_booked_ranges(client, listing):
    body = client.get(f"/api/listings/{listing.id}/availability", params={"start": "2026-01-10", "end": "2026-03-01"}).json()
    assert body["booked"] == [{"check_in": "2026-02-10", "check_out": "2026-02-14"}]


def test_availability_defaults_to_a_year_from_today(client, listing):
    body = client.get(f"/api/listings/{listing.id}/availability").json()
    assert body["start"] == "2026-01-10" and body["end"] == "2027-01-10"


def test_availability_rejects_inverted_window(client, listing):
    response = client.get(f"/api/listings/{listing.id}/availability", params={"start": "2026-03-01", "end": "2026-02-01"})
    assert response.status_code == 422 and response.json()["error"]["code"] == "invalid_window"


def test_quote_returns_breakdown(client, listing):
    body = client.get(f"/api/listings/{listing.id}/quote",
                      params={"check_in": "2026-03-01", "check_out": "2026-03-04", "adults": 2}).json()
    assert body == {"nightly_price": 2500, "nights": 3, "subtotal": 7500, "cleaning_fee": 500,
                    "service_fee": 1120, "taxes": 960, "total": 10080}


def test_quote_conflict_is_409(client, listing):
    response = client.get(f"/api/listings/{listing.id}/quote", params={"check_in": "2026-02-12", "check_out": "2026-02-15"})
    assert response.status_code == 409 and response.json()["error"]["code"] == "dates_unavailable"


def test_quote_too_many_guests_is_422(client, listing):
    response = client.get(f"/api/listings/{listing.id}/quote",
                          params={"check_in": "2026-03-01", "check_out": "2026-03-04", "adults": 5})
    assert response.status_code == 422 and response.json()["error"]["code"] == "too_many_guests"


def test_reviews_are_paginated_newest_first(client, listing):
    body = client.get(f"/api/listings/{listing.id}/reviews").json()
    assert body["total"] == 1
    review = body["items"][0]
    assert review["author_name"] == "Neha Gupta" and review["rating"] == 4
    assert review["comment"] == "Lovely place and a very kind host."
