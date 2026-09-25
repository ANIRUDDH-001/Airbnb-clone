from datetime import date

import pytest

from tests.factories import make_amenity, make_booking, make_category, make_listing, make_user

PAYLOAD = {
    "title": "Cliffside cottage", "description": "A quiet cottage above the sea with sunset views.",
    "property_type": "cottage", "room_type": "entire_home", "max_guests": 4, "bedrooms": 2, "beds": 2,
    "bathrooms": 1, "nightly_price": 4200, "cleaning_fee": 600, "address": "12 Cliff Road", "city": "Candolim",
    "state": "Goa", "country": "India", "latitude": 15.51, "longitude": 73.76,
    "photo_urls": ["https://images.example.com/a.jpg", "https://images.example.com/b.jpg"],
    "amenity_codes": ["wifi"], "category_slugs": ["beachfront"],
}


@pytest.fixture
def host(db, login):
    make_amenity(db, "wifi")
    make_amenity(db, "pool")
    make_category(db, "beachfront")
    user = make_user(db, name="Host")
    login(user)
    return user


def test_create_listing(client, host):
    response = client.post("/api/host/listings", json=PAYLOAD)
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["title"] == "Cliffside cottage" and body["host"]["id"] == host.id
    assert body["photos"] == PAYLOAD["photo_urls"]
    assert [a["code"] for a in body["amenities"]] == ["wifi"]
    assert client.get("/api/auth/me").json()["is_host"] is True


def test_create_validates_input(client, host):
    response = client.post("/api/host/listings", json={**PAYLOAD, "nightly_price": 0, "photo_urls": []})
    assert response.status_code == 422 and response.json()["error"]["code"] == "validation_error"


def test_create_rejects_unknown_amenity(client, host):
    response = client.post("/api/host/listings", json={**PAYLOAD, "amenity_codes": ["jacuzzi"]})
    assert response.status_code == 422 and response.json()["error"]["code"] == "unknown_amenity"


def test_create_rejects_non_http_photo(client, host):
    response = client.post("/api/host/listings", json={**PAYLOAD, "photo_urls": ["javascript:alert(1)"]})
    assert response.status_code == 422


def test_update_replaces_photos_amenities_and_fields(client, host):
    listing_id = client.post("/api/host/listings", json=PAYLOAD).json()["id"]
    update = {**PAYLOAD, "title": "Cliffside cottage (renovated)", "nightly_price": 5000,
              "photo_urls": ["https://images.example.com/c.jpg"], "amenity_codes": ["wifi", "pool"], "category_slugs": []}
    body = client.put(f"/api/host/listings/{listing_id}", json=update).json()
    assert body["title"] == "Cliffside cottage (renovated)" and body["nightly_price"] == 5000
    assert body["photos"] == ["https://images.example.com/c.jpg"]
    assert sorted(a["code"] for a in body["amenities"]) == ["pool", "wifi"] and body["categories"] == []


def test_only_owner_can_edit_or_delete(client, db, host):
    stranger_listing = make_listing(db, make_user(db))
    assert client.put(f"/api/host/listings/{stranger_listing.id}", json=PAYLOAD).status_code == 403
    assert client.delete(f"/api/host/listings/{stranger_listing.id}").status_code == 403


def test_host_listings_with_upcoming_counts(client, db, host):
    mine = make_listing(db, host, title="Mine")
    make_listing(db, make_user(db), title="Not mine")
    guest = make_user(db)
    make_booking(db, mine, guest, date(2026, 2, 1), date(2026, 2, 3))
    make_booking(db, mine, guest, date(2025, 12, 1), date(2025, 12, 3))  # past, not counted
    body = client.get("/api/host/listings").json()
    assert [(l["title"], l["upcoming_reservations"]) for l in body] == [("Mine", 1)]


def test_delete_soft_deletes_and_hides(client, db, host):
    listing = make_listing(db, host)
    assert client.delete(f"/api/host/listings/{listing.id}").status_code == 204
    assert client.get(f"/api/listings/{listing.id}").status_code == 404
    assert client.get("/api/host/listings").json() == []


def test_delete_refused_with_upcoming_booking(client, db, host):
    listing = make_listing(db, host)
    make_booking(db, listing, make_user(db), date(2026, 2, 1), date(2026, 2, 3))
    response = client.delete(f"/api/host/listings/{listing.id}")
    assert response.status_code == 409 and response.json()["error"]["code"] == "has_upcoming_bookings"


def test_deleted_listing_still_in_trips(client, db, host, login):
    listing = make_listing(db, host, title="Old place")
    guest = make_user(db)
    make_booking(db, listing, guest, date(2025, 12, 1), date(2025, 12, 3))
    assert client.delete(f"/api/host/listings/{listing.id}").status_code == 204
    login(guest)
    assert client.get("/api/bookings/mine").json()[0]["listing"]["title"] == "Old place"
