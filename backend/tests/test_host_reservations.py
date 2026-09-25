from datetime import date

from tests.factories import make_booking, make_listing, make_user


def test_host_sees_reservations_on_own_listings_only(client, db, login):
    host, guest = make_user(db, name="Host"), make_user(db, name="Guest Person")
    mine, theirs = make_listing(db, host, title="Mine"), make_listing(db, make_user(db), title="Theirs")
    make_booking(db, mine, guest, date(2026, 2, 1), date(2026, 2, 3))
    make_booking(db, mine, guest, date(2025, 12, 1), date(2025, 12, 3))
    make_booking(db, theirs, guest, date(2026, 2, 1), date(2026, 2, 3))
    login(host)

    all_rows = client.get("/api/host/reservations").json()
    assert [(r["listing"]["title"], r["phase"]) for r in all_rows] == [("Mine", "past"), ("Mine", "upcoming")]
    assert all_rows[1]["guest"]["name"] == "Guest Person"
    assert all_rows[1]["can_review"] is False and all_rows[1]["can_cancel"] is True

    upcoming = client.get("/api/host/reservations", params={"phase": "upcoming"}).json()
    assert len(upcoming) == 1


def test_reservations_require_login(client):
    assert client.get("/api/host/reservations").status_code == 401
