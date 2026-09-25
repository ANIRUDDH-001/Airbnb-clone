from datetime import date, datetime

import pytest

from app.models import WishlistItem
from tests.factories import make_amenity, make_booking, make_category, make_listing, make_user

D = date


@pytest.fixture
def world(db):
    host, guest = make_user(db), make_user(db)
    wifi, pool = make_amenity(db, "wifi"), make_amenity(db, "pool")
    beach = make_category(db, "beachfront")
    goa = make_listing(db, host, title="Goa villa", city="Anjuna", state="Goa", nightly_price=5000,
                       max_guests=6, property_type="villa", amenities=[wifi, pool], categories=[beach])
    jaipur = make_listing(db, host, title="Jaipur haveli", city="Jaipur", state="Rajasthan", nightly_price=3000,
                          max_guests=2, room_type="private_room", amenities=[wifi])
    manali = make_listing(db, host, title="Manali cabin", city="Manali", state="Himachal Pradesh",
                          nightly_price=4000, max_guests=4, property_type="cabin")
    return {"host": host, "guest": guest, "goa": goa, "jaipur": jaipur, "manali": manali}


def titles(response):
    assert response.status_code == 200, response.text
    return [item["title"] for item in response.json()["items"]]


def test_search_returns_active_listings_with_card_fields(client, db, world):
    world["manali"].deleted_at = datetime(2026, 1, 1)
    db.commit()
    body = client.get("/api/listings").json()
    assert body["total"] == 2 and body["page"] == 1 and body["has_more"] is False
    card = next(i for i in body["items"] if i["title"] == "Goa villa")
    assert len(card["photos"]) == 3
    assert card["stay_price"] is None and card["is_wishlisted"] is False
    assert card["nightly_price"] == 5000 and card["city"] == "Anjuna"


def test_pagination(client, world):
    body = client.get("/api/listings", params={"page_size": 2, "sort": "price_asc"}).json()
    assert [i["title"] for i in body["items"]] == ["Jaipur haveli", "Manali cabin"]
    assert body["total"] == 3 and body["has_more"] is True
    assert titles(client.get("/api/listings", params={"page_size": 2, "page": 2, "sort": "price_asc"})) == ["Goa villa"]


@pytest.mark.parametrize(
    ("term", "expected"),
    [
        ("goa", ["Goa villa"]),                                        # state
        ("Goa, India", ["Goa villa"]),                                 # first comma part is used
        ("RAJASTHAN", ["Jaipur haveli"]),                              # case-insensitive
        ("manali", ["Manali cabin"]),                                  # city
        ("india", ["Goa villa", "Jaipur haveli", "Manali cabin"]),     # country
    ],
)
def test_location_matches_city_state_or_country(client, world, term, expected):
    assert sorted(titles(client.get("/api/listings", params={"location": term}))) == expected


def test_location_escapes_wildcards(client, world):
    assert titles(client.get("/api/listings", params={"location": "%"})) == []


def test_guest_count_filter(client, world):
    assert sorted(titles(client.get("/api/listings", params={"guests": 5}))) == ["Goa villa"]


def test_price_range_filter(client, world):
    assert titles(client.get("/api/listings", params={"min_price": 3500, "max_price": 4500})) == ["Manali cabin"]


def test_price_range_rejects_min_above_max(client, world):
    response = client.get("/api/listings", params={"min_price": 5000, "max_price": 1000})
    assert response.status_code == 422 and response.json()["error"]["code"] == "invalid_price_range"


def test_room_and_property_type_filters(client, world):
    assert titles(client.get("/api/listings", params={"room_type": "private_room"})) == ["Jaipur haveli"]
    result = client.get("/api/listings", params=[("property_types", "villa"), ("property_types", "cabin"), ("sort", "price_asc")])
    assert titles(result) == ["Manali cabin", "Goa villa"]


def test_amenities_filter_requires_all(client, world):
    assert sorted(titles(client.get("/api/listings", params=[("amenities", "wifi")]))) == ["Goa villa", "Jaipur haveli"]
    assert titles(client.get("/api/listings", params=[("amenities", "wifi"), ("amenities", "pool")])) == ["Goa villa"]


def test_category_filter(client, world):
    assert titles(client.get("/api/listings", params={"category": "beachfront"})) == ["Goa villa"]


def test_dates_exclude_booked_listings_and_add_stay_price(client, db, world):
    make_booking(db, world["goa"], world["guest"], D(2026, 2, 10), D(2026, 2, 14))
    body = client.get("/api/listings", params={"check_in": "2026-02-12", "check_out": "2026-02-15", "sort": "price_asc"}).json()
    assert [i["title"] for i in body["items"]] == ["Jaipur haveli", "Manali cabin"]
    # Jaipur: 3,000 × 3 = 9,000 + 500 cleaning = 9,500; +14% service (1,330) +12% taxes (1,140) = 11,970
    assert body["items"][0]["stay_price"] == {"nights": 3, "total": 11970}


def test_back_to_back_dates_keep_listing_in_results(client, db, world):
    make_booking(db, world["goa"], world["guest"], D(2026, 2, 10), D(2026, 2, 14))
    assert "Goa villa" in titles(client.get("/api/listings", params={"check_in": "2026-02-14", "check_out": "2026-02-16"}))


def test_search_rejects_half_dates(client, world):
    response = client.get("/api/listings", params={"check_in": "2026-02-12"})
    assert response.status_code == 422 and response.json()["error"]["code"] == "invalid_dates"


def test_search_rejects_past_dates(client, world):
    response = client.get("/api/listings", params={"check_in": "2026-01-01", "check_out": "2026-01-03"})
    assert response.status_code == 422 and response.json()["error"]["code"] == "invalid_dates"


def test_search_rejects_bad_page_size(client, world):
    response = client.get("/api/listings", params={"page_size": 500})
    assert response.status_code == 422 and response.json()["error"]["code"] == "validation_error"


def test_is_wishlisted_for_logged_in_viewer(client, db, world, login):
    db.add(WishlistItem(user_id=world["guest"].id, listing_id=world["goa"].id))
    db.commit()
    login(world["guest"])
    saved = {i["title"]: i["is_wishlisted"] for i in client.get("/api/listings").json()["items"]}
    assert saved == {"Goa villa": True, "Jaipur haveli": False, "Manali cabin": False}
