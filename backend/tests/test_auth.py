from tests.factories import make_listing, make_user


def test_login_sets_session_and_me_returns_user(client, db, login):
    user = make_user(db, name="Ananya Sharma", email="ananya@example.com")
    login(user)
    body = client.get("/api/auth/me").json()
    assert body == {"id": user.id, "name": "Ananya Sharma", "email": "ananya@example.com",
                    "avatar_url": None, "is_superhost": False, "is_host": False}


def test_login_is_case_insensitive(client, db):
    make_user(db, email="rahul@example.com")
    assert client.post("/api/auth/login", json={"email": "  Rahul@Example.com "}).status_code == 200


def test_login_unknown_email(client):
    response = client.post("/api/auth/login", json={"email": "nobody@example.com"})
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "unknown_account"


def test_me_requires_login(client):
    response = client.get("/api/auth/me")
    assert response.status_code == 401
    assert response.json() == {"error": {"code": "not_authenticated", "message": "Log in to continue"}}


def test_logout_clears_session(client, db, login):
    login(make_user(db))
    assert client.post("/api/auth/logout").status_code == 204
    assert client.get("/api/auth/me").status_code == 401


def test_is_host_true_when_user_owns_active_listing(client, db, login):
    host = make_user(db)
    make_listing(db, host)
    login(host)
    assert client.get("/api/auth/me").json()["is_host"] is True


def test_login_validates_body(client):
    response = client.post("/api/auth/login", json={})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"
