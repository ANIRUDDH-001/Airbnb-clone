from tests.factories import make_amenity, make_category


def test_categories_are_ordered_by_position(client, db):
    make_category(db, "cabins", position=2)
    make_category(db, "beachfront", position=1)
    assert [c["slug"] for c in client.get("/api/categories").json()] == ["beachfront", "cabins"]


def test_amenities_list(client, db):
    make_amenity(db, "wifi", group_name="Essentials")
    assert client.get("/api/amenities").json() == [
        {"code": "wifi", "name": "Wifi", "icon": "wifi", "group_name": "Essentials"}
    ]


def test_destinations_list(client):
    body = client.get("/api/destinations").json()
    assert len(body) == 12
    assert body[0] == {"name": "Goa", "state": "Goa", "country": "India", "latitude": 15.4909,
                       "longitude": 73.8278, "blurb": "Beaches, shacks and Portuguese villas"}
