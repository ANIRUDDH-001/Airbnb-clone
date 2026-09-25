from datetime import date

import pytest

import app.services.stay as stay_module
from tests.factories import make_booking, make_listing, make_review, make_user


@pytest.fixture
def people(db):
    host, guest, other = make_user(db, name="Host"), make_user(db, name="Guest"), make_user(db, name="Other")
    listing = make_listing(db, host, nightly_price=2500, cleaning_fee=500, max_guests=4)
    return {"host": host, "guest": guest, "other": other, "listing": listing}


def book(client, listing_id, check_in="2026-03-01", check_out="2026-03-04", **extra):
    return client.post("/api/bookings", json={"listing_id": listing_id, "check_in": check_in,
                                              "check_out": check_out, "adults": 2, **extra})


def test_create_booking_snapshots_server_price(client, login, people):
    login(people["guest"])
    response = book(client, people["listing"].id)
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["status"] == "confirmed" and body["phase"] == "upcoming"
    assert (body["nights"], body["subtotal"], body["service_fee"], body["taxes"], body["total"]) == (3, 7500, 1120, 960, 10080)
    assert body["listing"]["host"]["name"] == "Host" and body["guest"]["name"] == "Guest"
    assert body["can_cancel"] is True and body["can_review"] is False


def test_client_cannot_send_its_own_price(client, login, people):
    login(people["guest"])
    response = book(client, people["listing"].id, total=1)
    assert response.status_code == 422  # extra fields are forbidden on BookingCreate


def test_booking_requires_login(client, people):
    assert book(client, people["listing"].id).status_code == 401


def test_overlapping_booking_is_409(client, login, people):
    login(people["guest"])
    assert book(client, people["listing"].id).status_code == 201
    login(people["other"])
    response = book(client, people["listing"].id, check_in="2026-03-03", check_out="2026-03-05")
    assert response.status_code == 409 and response.json()["error"]["code"] == "dates_unavailable"


def test_back_to_back_bookings_allowed(client, login, people):
    login(people["guest"])
    assert book(client, people["listing"].id).status_code == 201
    assert book(client, people["listing"].id, check_in="2026-03-04", check_out="2026-03-06").status_code == 201


def test_race_is_caught_by_trigger(client, db, login, people, monkeypatch):
    make_booking(db, people["listing"], people["other"], date(2026, 3, 1), date(2026, 3, 4))
    monkeypatch.setattr(stay_module, "is_available", lambda *args, **kwargs: True)  # both requests "passed" the check
    login(people["guest"])
    response = book(client, people["listing"].id)
    assert response.status_code == 409 and response.json()["error"]["code"] == "dates_unavailable"


def test_host_cannot_book_own_listing(client, login, people):
    login(people["host"])
    response = book(client, people["listing"].id)
    assert response.status_code == 403 and response.json()["error"]["code"] == "own_listing"


def test_too_many_guests(client, login, people):
    login(people["guest"])
    response = book(client, people["listing"].id, adults=3, children=2)
    assert response.status_code == 422 and response.json()["error"]["code"] == "too_many_guests"


def test_price_snapshot_survives_price_change(client, db, login, people):
    login(people["guest"])
    booking_id = book(client, people["listing"].id).json()["id"]
    people["listing"].nightly_price = 9999
    db.commit()
    assert client.get(f"/api/bookings/{booking_id}").json()["total"] == 10080


def test_my_trips_groups_by_phase(client, db, login, people):
    listing, guest = people["listing"], people["guest"]
    make_booking(db, listing, guest, date(2025, 12, 1), date(2025, 12, 3))                        # past
    make_booking(db, listing, guest, date(2026, 2, 1), date(2026, 2, 3))                          # upcoming
    make_booking(db, listing, guest, date(2026, 2, 10), date(2026, 2, 12), status="cancelled")    # cancelled
    make_booking(db, listing, people["other"], date(2026, 4, 1), date(2026, 4, 3))                # not mine
    login(guest)
    trips = client.get("/api/bookings/mine").json()
    assert [t["phase"] for t in trips] == ["past", "upcoming", "cancelled"]
    assert [t["phase"] for t in client.get("/api/bookings/mine", params={"phase": "past"}).json()] == ["past"]
    past = trips[0]
    assert past["can_review"] is True and past["can_cancel"] is False


def test_booking_visible_to_guest_and_host_only(client, db, login, people):
    booking = make_booking(db, people["listing"], people["guest"], date(2026, 2, 1), date(2026, 2, 3))
    login(people["other"])
    assert client.get(f"/api/bookings/{booking.id}").status_code == 404
    login(people["host"])
    assert client.get(f"/api/bookings/{booking.id}").status_code == 200


def test_cancel_frees_the_dates(client, login, people):
    login(people["guest"])
    booking_id = book(client, people["listing"].id).json()["id"]
    cancelled = client.post(f"/api/bookings/{booking_id}/cancel").json()
    assert cancelled["status"] == "cancelled" and cancelled["phase"] == "cancelled" and cancelled["can_cancel"] is False
    login(people["other"])
    assert book(client, people["listing"].id).status_code == 201


def test_host_can_cancel_a_reservation(client, db, login, people):
    booking = make_booking(db, people["listing"], people["guest"], date(2026, 2, 1), date(2026, 2, 3))
    login(people["host"])
    assert client.post(f"/api/bookings/{booking.id}/cancel").json()["status"] == "cancelled"


def test_cannot_cancel_started_or_past_stay(client, db, login, people):
    started = make_booking(db, people["listing"], people["guest"], date(2026, 1, 10), date(2026, 1, 12))
    login(people["guest"])
    response = client.post(f"/api/bookings/{started.id}/cancel")
    assert response.status_code == 409 and response.json()["error"]["code"] == "cannot_cancel"


def test_reviewed_past_trip_cannot_be_reviewed_again(client, db, login, people):
    booking = make_booking(db, people["listing"], people["guest"], date(2025, 12, 1), date(2025, 12, 3))
    make_review(db, booking)
    login(people["guest"])
    trip = client.get(f"/api/bookings/{booking.id}").json()
    assert trip["can_review"] is False and trip["has_review"] is True
