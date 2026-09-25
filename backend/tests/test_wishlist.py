from datetime import datetime

import pytest

from tests.factories import make_listing, make_user


@pytest.fixture
def setup(db, login):
    user, host = make_user(db), make_user(db)
    login(user)
    return user, make_listing(db, host, title="Saved place"), make_listing(db, host, title="Other place")


def test_requires_login(client):
    assert client.get("/api/wishlist").status_code == 401


def test_save_is_idempotent_and_listed(client, setup):
    _, saved, _ = setup
    assert client.put(f"/api/wishlist/{saved.id}").status_code == 204
    assert client.put(f"/api/wishlist/{saved.id}").status_code == 204
    items = client.get("/api/wishlist").json()
    assert [(i["title"], i["is_wishlisted"]) for i in items] == [("Saved place", True)]


def test_unsave_is_idempotent(client, setup):
    _, saved, _ = setup
    client.put(f"/api/wishlist/{saved.id}")
    assert client.delete(f"/api/wishlist/{saved.id}").status_code == 204
    assert client.delete(f"/api/wishlist/{saved.id}").status_code == 204
    assert client.get("/api/wishlist").json() == []


def test_save_unknown_listing_is_404(client, setup):
    assert client.put("/api/wishlist/999").status_code == 404


def test_deleted_listings_drop_out_of_wishlist(client, db, setup):
    _, saved, _ = setup
    client.put(f"/api/wishlist/{saved.id}")
    saved.deleted_at = datetime(2026, 1, 1)
    db.commit()
    assert client.get("/api/wishlist").json() == []
