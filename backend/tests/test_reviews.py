from datetime import date

import pytest

from tests.factories import make_booking, make_listing, make_user

REVIEW = {"rating": 5, "cleanliness": 5, "accuracy": 4, "check_in": 5, "communication": 5,
          "location": 4, "value": 5, "comment": "Spotless, calm and exactly as pictured."}


@pytest.fixture
def stay(db, login):
    guest = make_user(db, name="Guest")
    listing = make_listing(db, make_user(db))
    past = make_booking(db, listing, guest, date(2025, 12, 1), date(2025, 12, 4))
    login(guest)
    return {"guest": guest, "listing": listing, "past": past}


def test_review_completed_stay_updates_listing_rating(client, db, stay):
    response = client.post(f"/api/bookings/{stay['past'].id}/review", json=REVIEW)
    assert response.status_code == 201, response.text
    assert response.json()["author_name"] == "Guest"
    detail = client.get(f"/api/listings/{stay['listing'].id}").json()
    assert detail["rating_avg"] == 5.0 and detail["review_count"] == 1
    assert detail["rating_breakdown"]["accuracy"] == 4.0
    trip = client.get(f"/api/bookings/{stay['past'].id}").json()
    assert trip["can_review"] is False and trip["has_review"] is True


def test_average_across_reviews(client, db, stay, login):
    client.post(f"/api/bookings/{stay['past'].id}/review", json=REVIEW)
    other = make_user(db)
    second = make_booking(db, stay["listing"], other, date(2025, 12, 10), date(2025, 12, 12))
    login(other)
    client.post(f"/api/bookings/{second.id}/review", json={**REVIEW, "rating": 4})
    assert client.get(f"/api/listings/{stay['listing'].id}").json()["rating_avg"] == 4.5


def test_cannot_review_before_checkout(client, db, stay):
    upcoming = make_booking(db, stay["listing"], stay["guest"], date(2026, 2, 1), date(2026, 2, 3))
    response = client.post(f"/api/bookings/{upcoming.id}/review", json=REVIEW)
    assert response.status_code == 409 and response.json()["error"]["code"] == "stay_not_finished"


def test_cannot_review_twice(client, stay):
    client.post(f"/api/bookings/{stay['past'].id}/review", json=REVIEW)
    response = client.post(f"/api/bookings/{stay['past'].id}/review", json=REVIEW)
    assert response.status_code == 409 and response.json()["error"]["code"] == "already_reviewed"


def test_cannot_review_cancelled_stay(client, db, stay):
    cancelled = make_booking(db, stay["listing"], stay["guest"], date(2025, 11, 1), date(2025, 11, 3), status="cancelled")
    response = client.post(f"/api/bookings/{cancelled.id}/review", json=REVIEW)
    assert response.status_code == 409 and response.json()["error"]["code"] == "not_reviewable"


def test_cannot_review_someone_elses_stay(client, db, stay, login):
    login(make_user(db))
    assert client.post(f"/api/bookings/{stay['past'].id}/review", json=REVIEW).status_code == 404


def test_rating_must_be_one_to_five(client, stay):
    response = client.post(f"/api/bookings/{stay['past'].id}/review", json={**REVIEW, "rating": 6})
    assert response.status_code == 422


def test_timestamps_are_serialised_as_utc(client, stay):
    review = client.post(f"/api/bookings/{stay['past'].id}/review", json=REVIEW).json()
    trip = client.get(f"/api/bookings/{stay['past'].id}").json()
    assert review["created_at"].endswith("Z") and trip["created_at"].endswith("Z")
