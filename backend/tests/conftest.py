from datetime import date

import pytest
from fastapi.testclient import TestClient

from app.core.clock import get_today
from app.core.config import Settings
from app.main import create_app

TODAY = date(2026, 1, 10)


@pytest.fixture
def app(tmp_path):
    settings = Settings(
        database_url=f"sqlite:///{(tmp_path / 'test.db').as_posix()}",
        session_secret="test-secret",
        seed_on_startup=False,
    )
    application = create_app(settings)
    application.dependency_overrides[get_today] = lambda: TODAY
    return application


@pytest.fixture
def db(app):
    session = app.state.sessionmaker()
    yield session
    session.close()


@pytest.fixture
def client(app):
    with TestClient(app) as test_client:
        yield test_client
