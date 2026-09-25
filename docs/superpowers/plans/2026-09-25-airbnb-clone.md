# Airbnb Clone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an Airbnb clone (Next.js + FastAPI + SQLite) that demonstrates search, availability, booking, trips, wishlist, reviews and host CRUD, deployed for ₹0.

**Architecture:** FastAPI owns every business rule and the SQLite database (routers → services → models). Next.js renders pages on the server and proxies browser calls from `/api/*` to FastAPI, so the session cookie is first-party. The database is rebuilt from the models and seeded on a fresh boot.

**Tech Stack:** Python 3.11 · FastAPI 0.141 · SQLAlchemy 2.1 (sync) · Pydantic 2.13 · pytest 9 · Next.js 16 · React 19 · TypeScript · Tailwind CSS 4

**Spec:** `docs/superpowers/specs/2026-09-25-airbnb-clone-design.md`

## Global Constraints

- Money is integer rupees everywhere (DB, API, UI). Never floats for money.
- Stays are half-open `[check_in, check_out)`; "today" is the IST calendar date from the `get_today` dependency.
- Every API error body is `{"error": {"code": str, "message": str}}` (validation errors add `details`).
- All routes live under `/api`. Routers contain no business rules; services contain no HTTP objects except `AppError`.
- Backend dependencies are pinned in `backend/requirements.txt`; add nothing else without updating the spec.
- Run backend commands from `backend/` with the virtualenv active (`.venv\Scripts\activate` on Windows).
- Commit after every task, with messages in the form `feat(backend): …`, `test(backend): …` and so on.

## Review Focus

- **Two requests race for the same dates.** Only one booking may win. Pinned by `test_race_is_caught_by_trigger` (Task 8).
- **A guest checks in on another guest's check-out day.** This must be allowed. Pinned by `test_back_to_back_bookings_allowed` (Tasks 2, 4 and 8).
- **A host edits the price after a booking.** Existing trips keep their original total. Pinned by `test_price_snapshot_survives_price_change` (Task 8).
- **A host deletes a listing that has upcoming guests.** The delete must be refused, and past trips must still render. Pinned by `test_delete_refused_with_upcoming_booking` and `test_deleted_listing_still_in_trips` (Task 10).
- **Search is given only one of the two dates, or dates in the past.** Expect a clear 422, not silently ignored filters. Pinned by `test_search_rejects_half_dates` and `test_search_rejects_past_dates` (Task 6).

---

## Phase roadmap

| Phase | Tasks | Deliverable | Exit check |
|---|---|---|---|
| **0–1 Backend** | 1–14 (below, fully detailed) | Complete API + seeded DB | `pytest` green; `uvicorn` boots with seeded data; `/docs` lists every endpoint |
| **2 Frontend foundation** | Scaffold Next.js, tokens + font, header/tabs/user menu, login modal, API layer + proxy, home grid + category bar + "Show more", footer, mobile nav | Home page with real data and demo login | Logged in via the proxy; cards render from the API |
| **3 Search & detail** | Search bar (Where/When/Who panels), date-range picker + helpers (Vitest), search page + chips + Filters modal + pagination, detail page (mosaic, gallery, amenities, calendar, Reserve card with live quote, reviews, OSM embed, host) | Browse and search | Dates exclude booked listings; the quote matches the backend |
| **4 Guest flows** | Confirm-and-pay, confirmation page, My Trips (tabs, cancel, write review), wishlist hearts + page, toasts | Booking end to end | A booked range becomes unselectable; a review updates the rating |
| **5 Host** | Hosting dashboard (reservations), listings manager, create wizard, edit page, delete with confirm | Host CRUD | Create/edit/delete from the UI; delete is refused with upcoming bookings |
| **6 Ship** | Responsive pass, empty/error/loading states, Coming-soon pages, Render + Vercel deploy, README (setup, architecture, schema diagram, API table, assumptions, evaluator walkthrough) | Submission | Both hosted URLs work end to end |
| Stretch | Search-page map with price pins (Leaflet + OSM tiles) | — | Only after Phase 6 |

Phases 2–6 each get their own detailed plan (same format as below), written once the previous phase is merged. That way the frontend plan is written against the real, tested API instead of a guess. Each will be reviewed before execution.

---

## Phase 0–1 file map (backend)

```
.gitignore
backend/
  .python-version            3.11.9
  requirements.txt           runtime pins
  requirements-dev.txt       + pytest, httpx
  pyproject.toml             pytest config
  app/
    main.py                  create_app(settings) factory
    destinations.py          the 12 destinations (search suggestions + seed)
    core/  config.py db.py errors.py clock.py auth.py
    models/  __init__.py user.py listing.py booking.py review.py wishlist.py
    schemas/ common.py user.py listing.py booking.py review.py
    services/ pricing.py stay.py users.py listings.py reviews.py bookings.py wishlist.py host.py
    routers/ __init__.py health.py auth.py catalog.py listings.py bookings.py wishlist.py host.py
    seed/  __main__.py data.py photos.py run.py
  scripts/check_photos.py    one-off: verifies every seed photo URL returns 200
  tests/  __init__.py conftest.py factories.py test_*.py
```

---

### Task 1: Repository and backend skeleton

**Files:**
- Create: `.gitignore`, `backend/.python-version`, `backend/requirements.txt`, `backend/requirements-dev.txt`, `backend/pyproject.toml`
- Create: `backend/app/__init__.py`, `backend/app/core/__init__.py`, `backend/app/core/config.py`, `backend/app/core/db.py`, `backend/app/core/errors.py`, `backend/app/core/clock.py`
- Create: `backend/app/models/__init__.py` (empty for now), `backend/app/routers/__init__.py`, `backend/app/routers/health.py`, `backend/app/main.py`
- Test: `backend/tests/__init__.py`, `backend/tests/conftest.py`, `backend/tests/test_health.py`

**Interfaces:**
- Produces: `create_app(settings: Settings | None) -> FastAPI`; `Settings(database_url, session_secret, cookie_secure, seed_on_startup)`; `Base`; `DbSession` (Annotated `Session` dependency); `AppError(status_code, code, message)`; `not_found(what) -> AppError`; `Today` (Annotated `date` dependency); `today_ist() -> date`; `ROUTERS: list[APIRouter]`; test fixtures `app`, `db`, `client`, and the constant `TODAY = date(2026, 1, 10)`.

- [ ] **Step 1: Initialise git and the Python environment**

```bash
cd "D:/Projects/Scalar AI LAB ROUND 2"
git init -b main
mkdir -p backend/app/core backend/app/models backend/app/routers backend/tests
```

Create `.gitignore`:
```gitignore
__pycache__/
*.pyc
.venv/
.pytest_cache/
backend/data/
backend/.env
node_modules/
.next/
frontend/.env*.local
.DS_Store
Thumbs.db
~$*.docx
```

Create `backend/.python-version`:
```
3.11.9
```

Create `backend/requirements.txt`:
```
fastapi==0.141.1
uvicorn[standard]==0.54.0
sqlalchemy==2.1.0
pydantic==2.13.5
pydantic-settings==2.15.0
itsdangerous==2.2.0
```

Create `backend/requirements-dev.txt`:
```
-r requirements.txt
pytest==9.1.1
httpx==0.28.1
```

Create `backend/pyproject.toml`:
```toml
[tool.pytest.ini_options]
testpaths = ["tests"]
pythonpath = ["."]
addopts = "-q"
```

```bash
cd backend
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements-dev.txt
```
Expected: installs without errors.

- [ ] **Step 2: Write the failing tests**

`backend/tests/__init__.py`: empty file.

`backend/tests/conftest.py`:
```python
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
```

`backend/tests/test_health.py`:
```python
def test_health_returns_ok(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_unknown_route_uses_error_envelope(client):
    response = client.get("/api/nope")
    assert response.status_code == 404
    assert response.json() == {"error": {"code": "not_found", "message": "Not Found"}}
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `.venv/Scripts/python -m pytest tests/test_health.py`
Expected: ERROR — `ModuleNotFoundError: No module named 'app.core.clock'`

- [ ] **Step 4: Implement the skeleton**

`backend/app/__init__.py`, `backend/app/core/__init__.py`, `backend/app/models/__init__.py`: empty files.

`backend/app/core/config.py`:
```python
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration, read from environment variables (or backend/.env)."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./data/app.db"
    session_secret: str = "dev-only-change-me"
    cookie_secure: bool = False
    seed_on_startup: bool = False  # switched on in Task 13 once the seed exists


@lru_cache
def get_settings() -> Settings:
    return Settings()
```

`backend/app/core/db.py`:
```python
from collections.abc import Iterator
from pathlib import Path
from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session


class Base(DeclarativeBase):
    pass


def make_engine(url: str) -> Engine:
    if url.startswith("sqlite:///") and ":memory:" not in url:
        Path(url.removeprefix("sqlite:///")).parent.mkdir(parents=True, exist_ok=True)
    engine = create_engine(url, connect_args={"check_same_thread": False})

    @event.listens_for(engine, "connect")
    def _enable_foreign_keys(dbapi_connection, _connection_record) -> None:
        # SQLite ignores foreign keys unless this is set on every connection.
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    return engine


def get_db(request: Request) -> Iterator[Session]:
    session: Session = request.app.state.sessionmaker()
    try:
        yield session
    finally:
        session.close()


DbSession = Annotated[Session, Depends(get_db)]
```

`backend/app/core/errors.py`:
```python
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


class AppError(Exception):
    """A business-rule failure the client should see, with a stable machine-readable code."""

    def __init__(self, status_code: int, code: str, message: str):
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message


def not_found(what: str) -> AppError:
    return AppError(404, "not_found", f"{what} not found")


def _envelope(status_code: int, code: str, message: str, **extra) -> JSONResponse:
    return JSONResponse(status_code=status_code, content={"error": {"code": code, "message": message, **extra}})


def install_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def _app_error(_request: Request, exc: AppError) -> JSONResponse:
        return _envelope(exc.status_code, exc.code, exc.message)

    @app.exception_handler(StarletteHTTPException)
    async def _http_error(_request: Request, exc: StarletteHTTPException) -> JSONResponse:
        code = "not_found" if exc.status_code == 404 else "http_error"
        return _envelope(exc.status_code, code, str(exc.detail))

    @app.exception_handler(RequestValidationError)
    async def _validation_error(_request: Request, exc: RequestValidationError) -> JSONResponse:
        details = [
            {"field": ".".join(str(part) for part in error.get("loc", ())[1:]), "message": error.get("msg", "")}
            for error in exc.errors()
        ]
        first = details[0] if details else {"field": "", "message": "Invalid request"}
        message = f"{first['field']}: {first['message']}" if first["field"] else first["message"]
        return _envelope(422, "validation_error", message, details=details)
```

`backend/app/core/clock.py`:
```python
from datetime import date, datetime, timedelta, timezone
from typing import Annotated

from fastapi import Depends

# India has no daylight saving, so a fixed offset is exact and needs no tz database.
IST = timezone(timedelta(hours=5, minutes=30))


def today_ist() -> date:
    return datetime.now(IST).date()


def get_today() -> date:
    """Dependency wrapper so tests can pin 'today' with app.dependency_overrides."""
    return today_ist()


Today = Annotated[date, Depends(get_today)]
```

`backend/app/routers/health.py`:
```python
from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
```

`backend/app/routers/__init__.py`:
```python
from app.routers import health

ROUTERS = [health.router]
```

`backend/app/main.py`:
```python
from contextlib import asynccontextmanager

from fastapi import FastAPI
from sqlalchemy.orm import sessionmaker
from starlette.middleware.sessions import SessionMiddleware

from app import models  # noqa: F401 — importing registers every table on Base.metadata
from app.core.clock import today_ist
from app.core.config import Settings, get_settings
from app.core.db import Base, make_engine
from app.core.errors import install_error_handlers
from app.routers import ROUTERS

SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    engine = make_engine(settings.database_url)
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine, expire_on_commit=False)

    @asynccontextmanager
    async def lifespan(_app: FastAPI):
        if settings.seed_on_startup:
            from app.seed.run import seed_if_empty

            with session_factory() as db:
                seed_if_empty(db, today_ist())
        yield
        engine.dispose()

    app = FastAPI(title="Airbnb Clone API", lifespan=lifespan)
    app.state.sessionmaker = session_factory
    app.add_middleware(
        SessionMiddleware,
        secret_key=settings.session_secret,
        session_cookie="session",
        max_age=SESSION_MAX_AGE_SECONDS,
        same_site="lax",
        https_only=settings.cookie_secure,
    )
    install_error_handlers(app)
    for router in ROUTERS:
        app.include_router(router, prefix="/api")
    return app
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `.venv/Scripts/python -m pytest tests/test_health.py`
Expected: `2 passed`

- [ ] **Step 6: Commit**

```bash
cd ..
git add .gitignore backend docs
git commit -m "chore: scaffold FastAPI backend with health endpoint and error envelope"
```

---

### Task 2: Database schema, constraints and the overlap trigger

**Files:**
- Create: `backend/app/models/user.py`, `listing.py`, `booking.py`, `review.py`, `wishlist.py`
- Modify: `backend/app/models/__init__.py`
- Test: `backend/tests/factories.py`, `backend/tests/test_models.py`

**Interfaces:**
- Produces: the ORM classes `User`, `Listing`, `ListingPhoto`, `Amenity`, `Category`, `Booking`, `Review` and `WishlistItem`; the tables `listing_amenities` and `listing_categories`; `PropertyType`, `RoomType` (Literal types); `PROPERTY_TYPES` and `ROOM_TYPES` (tuples).
- Test factories: `make_user(db, **kw) -> User`, `make_amenity(db, code, **kw) -> Amenity`, `make_category(db, slug, **kw) -> Category`, `make_listing(db, host, *, photo_count=3, amenities=(), categories=(), **kw) -> Listing`, `make_booking(db, listing, guest, check_in, check_out, **kw) -> Booking`, `make_review(db, booking, rating=5, **kw) -> Review`.

- [ ] **Step 1: Write the failing tests**

`backend/tests/factories.py`:
```python
import itertools
from datetime import date

from sqlalchemy.orm import Session

from app.models import Amenity, Booking, Category, Listing, ListingPhoto, Review, User

_seq = itertools.count(1)


def make_user(db: Session, **overrides) -> User:
    n = next(_seq)
    user = User(name=overrides.pop("name", f"User {n}"), email=overrides.pop("email", f"user{n}@example.com"), **overrides)
    db.add(user)
    db.commit()
    return user


def make_amenity(db: Session, code: str, **overrides) -> Amenity:
    amenity = Amenity(code=code, name=overrides.pop("name", code.replace("_", " ").title()),
                      icon=overrides.pop("icon", code), group_name=overrides.pop("group_name", "Essentials"), **overrides)
    db.add(amenity)
    db.commit()
    return amenity


def make_category(db: Session, slug: str, **overrides) -> Category:
    category = Category(slug=slug, name=overrides.pop("name", slug.replace("_", " ").title()),
                        icon=overrides.pop("icon", slug), position=overrides.pop("position", 0), **overrides)
    db.add(category)
    db.commit()
    return category


def make_listing(db: Session, host: User, *, photo_count: int = 3, amenities=(), categories=(), **overrides) -> Listing:
    n = next(_seq)
    fields = dict(
        title=f"Listing {n}", description="A lovely place to stay for a few nights.",
        property_type="flat", room_type="entire_home", max_guests=4, bedrooms=2, beds=2, bathrooms=1,
        nightly_price=2500, cleaning_fee=500, address=f"{n} Beach Road", city="Anjuna", state="Goa",
        country="India", latitude=15.58, longitude=73.74,
    )
    fields.update(overrides)
    listing = Listing(host_id=host.id, **fields)
    listing.photos = [ListingPhoto(url=f"https://images.example.com/{n}/{i}.jpg", position=i) for i in range(photo_count)]
    listing.amenities = list(amenities)
    listing.categories = list(categories)
    db.add(listing)
    db.commit()
    return listing


def make_booking(db: Session, listing: Listing, guest: User, check_in: date, check_out: date, **overrides) -> Booking:
    fields = dict(adults=2, children=0, infants=0, status="confirmed", nightly_price=listing.nightly_price,
                  nights=(check_out - check_in).days, cleaning_fee=listing.cleaning_fee, service_fee=0, taxes=0)
    fields.update(overrides)
    fields.setdefault("total", fields["nightly_price"] * fields["nights"] + fields["cleaning_fee"]
                      + fields["service_fee"] + fields["taxes"])
    booking = Booking(listing_id=listing.id, guest_id=guest.id, check_in=check_in, check_out=check_out, **fields)
    db.add(booking)
    db.commit()
    return booking


def make_review(db: Session, booking: Booking, rating: int = 5, **overrides) -> Review:
    review = Review(
        booking_id=booking.id, rating=rating, cleanliness_rating=rating, accuracy_rating=rating,
        check_in_rating=rating, communication_rating=rating, location_rating=rating, value_rating=rating,
        comment=overrides.pop("comment", "Wonderful stay, would come back."), **overrides,
    )
    db.add(review)
    db.commit()
    return review
```

`backend/tests/test_models.py`:
```python
from datetime import date

import pytest
from sqlalchemy import inspect
from sqlalchemy.exc import IntegrityError

from app.models import Listing
from tests.factories import make_booking, make_listing, make_review, make_user

D = date  # shorthand


@pytest.fixture
def stay_setup(db):
    host, guest = make_user(db), make_user(db)
    return make_listing(db, host), guest


def test_all_tables_exist(db):
    assert set(inspect(db.get_bind()).get_table_names()) == {
        "users", "listings", "listing_photos", "amenities", "listing_amenities", "categories",
        "listing_categories", "bookings", "reviews", "wishlist_items",
    }


def test_booking_requires_checkout_after_checkin(db, stay_setup):
    listing, guest = stay_setup
    with pytest.raises(IntegrityError):
        make_booking(db, listing, guest, D(2026, 2, 1), D(2026, 2, 1))
    db.rollback()


def test_booking_total_must_match_its_parts(db, stay_setup):
    listing, guest = stay_setup
    with pytest.raises(IntegrityError):
        make_booking(db, listing, guest, D(2026, 2, 1), D(2026, 2, 3), total=1)
    db.rollback()


def test_trigger_blocks_overlapping_confirmed_booking(db, stay_setup):
    listing, guest = stay_setup
    make_booking(db, listing, guest, D(2026, 2, 1), D(2026, 2, 5))
    with pytest.raises(IntegrityError, match="booking_overlap"):
        make_booking(db, listing, guest, D(2026, 2, 4), D(2026, 2, 6))
    db.rollback()


def test_back_to_back_bookings_allowed(db, stay_setup):
    listing, guest = stay_setup
    make_booking(db, listing, guest, D(2026, 2, 1), D(2026, 2, 5))
    make_booking(db, listing, guest, D(2026, 2, 5), D(2026, 2, 8))  # check-in on the previous check-out day


def test_trigger_ignores_cancelled_bookings(db, stay_setup):
    listing, guest = stay_setup
    make_booking(db, listing, guest, D(2026, 2, 1), D(2026, 2, 5), status="cancelled")
    make_booking(db, listing, guest, D(2026, 2, 2), D(2026, 2, 4))


def test_trigger_is_scoped_to_one_listing(db, stay_setup):
    listing, guest = stay_setup
    other = make_listing(db, listing.host)
    make_booking(db, listing, guest, D(2026, 2, 1), D(2026, 2, 5))
    make_booking(db, other, guest, D(2026, 2, 1), D(2026, 2, 5))


def test_foreign_keys_are_enforced(db):
    listing = Listing(host_id=9999, title="x", description="x", property_type="flat", room_type="entire_home",
                      max_guests=1, bedrooms=1, beds=1, bathrooms=1, nightly_price=100, cleaning_fee=0,
                      address="x", city="x", country="x", latitude=0, longitude=0)
    db.add(listing)
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()


def test_listing_rejects_unknown_property_type(db):
    host = make_user(db)
    with pytest.raises(IntegrityError):
        make_listing(db, host, property_type="castle")
    db.rollback()


def test_one_review_per_booking(db, stay_setup):
    listing, guest = stay_setup
    booking = make_booking(db, listing, guest, D(2026, 1, 1), D(2026, 1, 3))
    make_review(db, booking)
    with pytest.raises(IntegrityError):
        make_review(db, booking)
    db.rollback()
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `.venv/Scripts/python -m pytest tests/test_models.py`
Expected: ERROR — `ImportError: cannot import name 'Amenity' from 'app.models'`

- [ ] **Step 3: Implement the models**

`backend/app/models/user.py`:
```python
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base

if TYPE_CHECKING:
    from app.models.listing import Listing


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(80))
    email: Mapped[str] = mapped_column(String(255), unique=True)  # stored lower-case
    avatar_url: Mapped[str | None] = mapped_column(String(500))
    bio: Mapped[str | None] = mapped_column(Text)
    is_superhost: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    listings: Mapped[list["Listing"]] = relationship(back_populates="host")
```

`backend/app/models/listing.py`:
```python
from datetime import datetime
from typing import TYPE_CHECKING, Literal, get_args

from sqlalchemy import CheckConstraint, Column, ForeignKey, Index, String, Table, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base

if TYPE_CHECKING:
    from app.models.user import User

PropertyType = Literal[
    "house", "flat", "guest_house", "hotel", "villa", "cabin", "cottage", "tiny_home", "farm_stay", "houseboat"
]
RoomType = Literal["entire_home", "private_room", "shared_room"]
PROPERTY_TYPES: tuple[str, ...] = get_args(PropertyType)
ROOM_TYPES: tuple[str, ...] = get_args(RoomType)


def _one_of(column: str, values: tuple[str, ...]) -> str:
    return f"{column} IN ({', '.join(repr(v) for v in values)})"


listing_amenities = Table(
    "listing_amenities",
    Base.metadata,
    Column("listing_id", ForeignKey("listings.id", ondelete="CASCADE"), primary_key=True),
    Column("amenity_id", ForeignKey("amenities.id", ondelete="RESTRICT"), primary_key=True),
)

listing_categories = Table(
    "listing_categories",
    Base.metadata,
    Column("listing_id", ForeignKey("listings.id", ondelete="CASCADE"), primary_key=True),
    Column("category_id", ForeignKey("categories.id", ondelete="RESTRICT"), primary_key=True),
)


class Amenity(Base):
    __tablename__ = "amenities"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(40), unique=True)
    name: Mapped[str] = mapped_column(String(80))
    icon: Mapped[str] = mapped_column(String(40))
    group_name: Mapped[str] = mapped_column(String(40))


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(40), unique=True)
    name: Mapped[str] = mapped_column(String(60))
    icon: Mapped[str] = mapped_column(String(40))
    position: Mapped[int] = mapped_column(default=0)


class Listing(Base):
    __tablename__ = "listings"
    __table_args__ = (
        CheckConstraint(_one_of("property_type", PROPERTY_TYPES), name="ck_listings_property_type"),
        CheckConstraint(_one_of("room_type", ROOM_TYPES), name="ck_listings_room_type"),
        CheckConstraint("max_guests BETWEEN 1 AND 16", name="ck_listings_max_guests"),
        CheckConstraint("bedrooms >= 0 AND beds >= 1 AND bathrooms >= 0", name="ck_listings_rooms"),
        CheckConstraint("nightly_price > 0", name="ck_listings_nightly_price"),
        CheckConstraint("cleaning_fee >= 0", name="ck_listings_cleaning_fee"),
        CheckConstraint("latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180", name="ck_listings_coords"),
        CheckConstraint("rating_avg IS NULL OR rating_avg BETWEEN 1 AND 5", name="ck_listings_rating_avg"),
        CheckConstraint("review_count >= 0", name="ck_listings_review_count"),
        Index("ix_listings_host_id", "host_id"),
        Index("ix_listings_city", "city"),
        Index("ix_listings_nightly_price", "nightly_price"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    host_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"))
    title: Mapped[str] = mapped_column(String(100))
    description: Mapped[str] = mapped_column(Text)
    property_type: Mapped[str] = mapped_column(String(20))
    room_type: Mapped[str] = mapped_column(String(20))
    max_guests: Mapped[int]
    bedrooms: Mapped[int]
    beds: Mapped[int]
    bathrooms: Mapped[int]
    nightly_price: Mapped[int]
    cleaning_fee: Mapped[int] = mapped_column(default=0)
    address: Mapped[str] = mapped_column(String(200))
    city: Mapped[str] = mapped_column(String(80))
    state: Mapped[str | None] = mapped_column(String(80))
    country: Mapped[str] = mapped_column(String(80))
    latitude: Mapped[float]
    longitude: Mapped[float]
    # Denormalised review cache, recomputed by services.reviews whenever a review is written.
    rating_avg: Mapped[float | None]
    review_count: Mapped[int] = mapped_column(default=0)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())
    deleted_at: Mapped[datetime | None]  # soft delete keeps past trips intact

    host: Mapped["User"] = relationship(back_populates="listings")
    photos: Mapped[list["ListingPhoto"]] = relationship(
        back_populates="listing", order_by="ListingPhoto.position", cascade="all, delete-orphan"
    )
    amenities: Mapped[list[Amenity]] = relationship(secondary=listing_amenities)
    categories: Mapped[list[Category]] = relationship(secondary=listing_categories)


class ListingPhoto(Base):
    __tablename__ = "listing_photos"
    __table_args__ = (UniqueConstraint("listing_id", "position", name="uq_listing_photos_position"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    listing_id: Mapped[int] = mapped_column(ForeignKey("listings.id", ondelete="CASCADE"))
    url: Mapped[str] = mapped_column(String(500))
    position: Mapped[int]  # 0 = cover photo

    listing: Mapped[Listing] = relationship(back_populates="photos")
```

`backend/app/models/booking.py`:
```python
from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import DDL, CheckConstraint, ForeignKey, Index, String, event, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base

if TYPE_CHECKING:
    from app.models.listing import Listing
    from app.models.review import Review
    from app.models.user import User


class Booking(Base):
    __tablename__ = "bookings"
    __table_args__ = (
        CheckConstraint("check_out > check_in", name="ck_bookings_dates"),
        CheckConstraint("adults >= 1 AND children >= 0 AND infants >= 0", name="ck_bookings_guests"),
        CheckConstraint("status IN ('confirmed', 'cancelled')", name="ck_bookings_status"),
        CheckConstraint("nights >= 1", name="ck_bookings_nights"),
        CheckConstraint(
            "nightly_price > 0 AND cleaning_fee >= 0 AND service_fee >= 0 AND taxes >= 0", name="ck_bookings_amounts"
        ),
        CheckConstraint(
            "total = nightly_price * nights + cleaning_fee + service_fee + taxes", name="ck_bookings_total"
        ),
        Index("ix_bookings_listing_dates", "listing_id", "check_in", "check_out"),
        Index("ix_bookings_guest_id", "guest_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    listing_id: Mapped[int] = mapped_column(ForeignKey("listings.id", ondelete="RESTRICT"))
    guest_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"))
    check_in: Mapped[date]
    check_out: Mapped[date]
    adults: Mapped[int]
    children: Mapped[int] = mapped_column(default=0)
    infants: Mapped[int] = mapped_column(default=0)
    status: Mapped[str] = mapped_column(String(12), default="confirmed")
    # Price snapshot taken at booking time; later listing edits never change it.
    nightly_price: Mapped[int]
    nights: Mapped[int]
    cleaning_fee: Mapped[int]
    service_fee: Mapped[int]
    taxes: Mapped[int]
    total: Mapped[int]
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    cancelled_at: Mapped[datetime | None]

    listing: Mapped["Listing"] = relationship()
    guest: Mapped["User"] = relationship()
    review: Mapped["Review | None"] = relationship(back_populates="booking")


# Database-level guarantee that two confirmed stays on one listing never overlap,
# even if two requests pass the service-level check at the same moment.
NO_OVERLAP_TRIGGER = DDL(
    """
    CREATE TRIGGER IF NOT EXISTS trg_bookings_no_overlap
    BEFORE INSERT ON bookings
    WHEN NEW.status = 'confirmed'
    BEGIN
        SELECT RAISE(ABORT, 'booking_overlap')
        WHERE EXISTS (
            SELECT 1 FROM bookings AS b
            WHERE b.listing_id = NEW.listing_id
              AND b.status = 'confirmed'
              AND b.check_in < NEW.check_out
              AND NEW.check_in < b.check_out
        );
    END
    """
)
event.listen(Booking.__table__, "after_create", NO_OVERLAP_TRIGGER)
```

`backend/app/models/review.py`:
```python
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, ForeignKey, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base

if TYPE_CHECKING:
    from app.models.booking import Booking

RATING_COLUMNS = (
    "rating", "cleanliness_rating", "accuracy_rating", "check_in_rating",
    "communication_rating", "location_rating", "value_rating",
)


class Review(Base):
    __tablename__ = "reviews"
    __table_args__ = (
        CheckConstraint(" AND ".join(f"{c} BETWEEN 1 AND 5" for c in RATING_COLUMNS), name="ck_reviews_ratings"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    # UNIQUE: one review per stay. Listing and author are reached through the booking.
    booking_id: Mapped[int] = mapped_column(ForeignKey("bookings.id", ondelete="CASCADE"), unique=True)
    rating: Mapped[int]
    cleanliness_rating: Mapped[int]
    accuracy_rating: Mapped[int]
    check_in_rating: Mapped[int]
    communication_rating: Mapped[int]
    location_rating: Mapped[int]
    value_rating: Mapped[int]
    comment: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    booking: Mapped["Booking"] = relationship(back_populates="review")
```

`backend/app/models/wishlist.py`:
```python
from datetime import datetime

from sqlalchemy import ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class WishlistItem(Base):
    __tablename__ = "wishlist_items"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    listing_id: Mapped[int] = mapped_column(ForeignKey("listings.id", ondelete="CASCADE"), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
```

`backend/app/models/__init__.py`:
```python
from app.models.booking import Booking
from app.models.listing import (
    PROPERTY_TYPES, ROOM_TYPES, Amenity, Category, Listing, ListingPhoto, PropertyType, RoomType,
    listing_amenities, listing_categories,
)
from app.models.review import Review
from app.models.user import User
from app.models.wishlist import WishlistItem

__all__ = [
    "Amenity", "Booking", "Category", "Listing", "ListingPhoto", "PROPERTY_TYPES", "PropertyType",
    "ROOM_TYPES", "Review", "RoomType", "User", "WishlistItem", "listing_amenities", "listing_categories",
]
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `.venv/Scripts/python -m pytest`
Expected: `12 passed`

- [ ] **Step 5: Commit**

```bash
git add backend/app/models backend/tests
git commit -m "feat(backend): add schema with constraints and booking overlap trigger"
```

---

### Task 3: Pricing (pure function)

**Files:**
- Create: `backend/app/services/__init__.py` (empty), `backend/app/services/pricing.py`
- Test: `backend/tests/test_pricing.py`

**Interfaces:**
- Produces: `PriceQuote` (frozen dataclass: `nightly_price, nights, subtotal, cleaning_fee, service_fee, taxes, total` — all `int`); `quote(nightly_price: int, cleaning_fee: int, check_in: date, check_out: date) -> PriceQuote`; the constants `SERVICE_FEE_RATE = Decimal("0.14")` and `TAX_RATE = Decimal("0.12")`.

- [ ] **Step 1: Write the failing tests**

`backend/tests/test_pricing.py`:
```python
from datetime import date

import pytest

from app.services.pricing import PriceQuote, quote


def test_quote_breaks_down_a_three_night_stay():
    result = quote(2500, 800, date(2026, 2, 1), date(2026, 2, 4))
    assert result == PriceQuote(
        nightly_price=2500, nights=3, subtotal=7500, cleaning_fee=800,
        service_fee=1162,  # 14% of 8300
        taxes=996,         # 12% of 8300
        total=10458,
    )


def test_quote_rounds_half_up_not_bankers():
    result = quote(75, 0, date(2026, 2, 1), date(2026, 2, 2))
    assert result.service_fee == 11  # 10.5 rounds up; Python's round() would give 10
    assert result.taxes == 9
    assert result.total == 95


def test_quote_total_equals_sum_of_parts():
    r = quote(4321, 777, date(2026, 3, 1), date(2026, 3, 8))
    assert r.total == r.subtotal + r.cleaning_fee + r.service_fee + r.taxes
    assert r.subtotal == r.nightly_price * r.nights


def test_quote_rejects_zero_nights():
    with pytest.raises(ValueError):
        quote(2500, 0, date(2026, 2, 1), date(2026, 2, 1))
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `.venv/Scripts/python -m pytest tests/test_pricing.py`
Expected: ERROR — `ModuleNotFoundError: No module named 'app.services'`

- [ ] **Step 3: Implement**

`backend/app/services/__init__.py`: empty.

`backend/app/services/pricing.py`:
```python
"""The single place a stay's price is calculated. Used by the quote and booking endpoints and by the seed."""

from dataclasses import dataclass
from datetime import date
from decimal import ROUND_HALF_UP, Decimal

SERVICE_FEE_RATE = Decimal("0.14")
TAX_RATE = Decimal("0.12")  # mocked flat rate (see README assumptions)


@dataclass(frozen=True)
class PriceQuote:
    nightly_price: int
    nights: int
    subtotal: int
    cleaning_fee: int
    service_fee: int
    taxes: int
    total: int


def _percent_of(amount: int, rate: Decimal) -> int:
    return int((Decimal(amount) * rate).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def quote(nightly_price: int, cleaning_fee: int, check_in: date, check_out: date) -> PriceQuote:
    nights = (check_out - check_in).days
    if nights < 1:
        raise ValueError("check_out must be after check_in")
    subtotal = nightly_price * nights
    fee_base = subtotal + cleaning_fee
    service_fee = _percent_of(fee_base, SERVICE_FEE_RATE)
    taxes = _percent_of(fee_base, TAX_RATE)
    return PriceQuote(
        nightly_price=nightly_price, nights=nights, subtotal=subtotal, cleaning_fee=cleaning_fee,
        service_fee=service_fee, taxes=taxes, total=fee_base + service_fee + taxes,
    )
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `.venv/Scripts/python -m pytest tests/test_pricing.py`
Expected: `4 passed`

- [ ] **Step 5: Commit**

```bash
git add backend/app/services backend/tests/test_pricing.py
git commit -m "feat(backend): add pricing service with half-up rounding"
```

---

### Task 4: Stay rules (dates, guests, availability, quote)

**Files:**
- Create: `backend/app/schemas/__init__.py` (empty), `backend/app/schemas/booking.py`, `backend/app/services/stay.py`
- Test: `backend/tests/test_stay.py`

**Interfaces:**
- Consumes: `quote` and `PriceQuote` (Task 3); `Booking` and `Listing` (Task 2); `AppError` (Task 1).
- Produces: `StayIn` (Pydantic model: `check_in, check_out, adults=1, children=0, infants=0`); `MAX_NIGHTS = 90`; `validate_stay(check_in, check_out, today) -> None`; `overlaps(check_in, check_out)`, a SQL condition on `Booking`; `is_available(db, listing_id, check_in, check_out) -> bool`; `booked_ranges(db, listing_id, start, end) -> list[tuple[date, date]]`; `quote_stay(db, listing, stay: StayIn, today) -> PriceQuote`.

- [ ] **Step 1: Write the failing tests**

`backend/tests/test_stay.py`:
```python
from datetime import date

import pytest

from app.core.errors import AppError
from app.schemas.booking import StayIn
from app.services.stay import booked_ranges, is_available, quote_stay, validate_stay
from tests.conftest import TODAY
from tests.factories import make_booking, make_listing, make_user

D = date


@pytest.mark.parametrize(
    ("check_in", "check_out", "code"),
    [
        (D(2026, 1, 9), D(2026, 1, 12), "invalid_dates"),   # past
        (D(2026, 1, 12), D(2026, 1, 12), "invalid_dates"),  # zero nights
        (D(2026, 1, 12), D(2026, 1, 11), "invalid_dates"),  # reversed
        (D(2026, 1, 12), D(2026, 4, 12), "invalid_dates"),  # > 90 nights
    ],
)
def test_validate_stay_rejects_bad_dates(check_in, check_out, code):
    with pytest.raises(AppError) as exc:
        validate_stay(check_in, check_out, TODAY)
    assert exc.value.status_code == 422 and exc.value.code == code


def test_validate_stay_accepts_today_checkin():
    validate_stay(TODAY, D(2026, 1, 12), TODAY)


@pytest.fixture
def booked_listing(db):
    host, guest = make_user(db), make_user(db)
    listing = make_listing(db, host, max_guests=3)
    make_booking(db, listing, guest, D(2026, 2, 10), D(2026, 2, 14))
    make_booking(db, listing, guest, D(2026, 2, 20), D(2026, 2, 22), status="cancelled")
    return listing


@pytest.mark.parametrize(
    ("check_in", "check_out", "expected"),
    [
        (D(2026, 2, 8), D(2026, 2, 10), True),    # ends on booked check-in
        (D(2026, 2, 14), D(2026, 2, 16), True),   # starts on booked check-out
        (D(2026, 2, 13), D(2026, 2, 15), False),  # straddles the end
        (D(2026, 2, 5), D(2026, 2, 20), False),   # contains it
        (D(2026, 2, 11), D(2026, 2, 12), False),  # inside it
        (D(2026, 2, 20), D(2026, 2, 22), True),   # only a cancelled booking there
    ],
)
def test_is_available(db, booked_listing, check_in, check_out, expected):
    assert is_available(db, booked_listing.id, check_in, check_out) is expected


def test_booked_ranges_returns_confirmed_ranges_in_window(db, booked_listing):
    assert booked_ranges(db, booked_listing.id, D(2026, 2, 1), D(2026, 3, 1)) == [(D(2026, 2, 10), D(2026, 2, 14))]
    assert booked_ranges(db, booked_listing.id, D(2026, 3, 1), D(2026, 4, 1)) == []


def test_quote_stay_happy_path(db, booked_listing):
    result = quote_stay(db, booked_listing, StayIn(check_in=D(2026, 3, 1), check_out=D(2026, 3, 3), adults=2), TODAY)
    assert result.nights == 2 and result.subtotal == 5000


def test_quote_stay_rejects_too_many_guests(db, booked_listing):
    stay = StayIn(check_in=D(2026, 3, 1), check_out=D(2026, 3, 3), adults=2, children=2, infants=3)
    with pytest.raises(AppError) as exc:
        quote_stay(db, booked_listing, stay, TODAY)
    assert exc.value.code == "too_many_guests"


def test_quote_stay_ignores_infants_in_guest_limit(db, booked_listing):
    stay = StayIn(check_in=D(2026, 3, 1), check_out=D(2026, 3, 3), adults=3, infants=2)
    assert quote_stay(db, booked_listing, stay, TODAY).nights == 2


def test_quote_stay_rejects_unavailable_dates(db, booked_listing):
    stay = StayIn(check_in=D(2026, 2, 12), check_out=D(2026, 2, 15))
    with pytest.raises(AppError) as exc:
        quote_stay(db, booked_listing, stay, TODAY)
    assert exc.value.status_code == 409 and exc.value.code == "dates_unavailable"
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `.venv/Scripts/python -m pytest tests/test_stay.py`
Expected: ERROR — `ModuleNotFoundError: No module named 'app.schemas'`

- [ ] **Step 3: Implement**

`backend/app/schemas/__init__.py`: empty.

`backend/app/schemas/booking.py`:
```python
from datetime import date

from pydantic import BaseModel, Field


class StayIn(BaseModel):
    """Dates and party size for a quote or a booking. Infants don't count towards max_guests."""

    check_in: date
    check_out: date
    adults: int = Field(default=1, ge=1, le=16)
    children: int = Field(default=0, ge=0, le=15)
    infants: int = Field(default=0, ge=0, le=5)
```

`backend/app/services/stay.py`:
```python
"""Rules for a stay: valid dates, party size, and availability (half-open [check_in, check_out) ranges)."""

from datetime import date

from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.models import Booking, Listing
from app.schemas.booking import StayIn
from app.services.pricing import PriceQuote, quote

MAX_NIGHTS = 90


def validate_stay(check_in: date, check_out: date, today: date) -> None:
    if check_in < today:
        raise AppError(422, "invalid_dates", "Check-in date can't be in the past")
    if check_out <= check_in:
        raise AppError(422, "invalid_dates", "Check-out must be after check-in")
    if (check_out - check_in).days > MAX_NIGHTS:
        raise AppError(422, "invalid_dates", f"Stays are limited to {MAX_NIGHTS} nights")


def overlaps(check_in: date, check_out: date):
    """SQL condition matching confirmed bookings whose range intersects [check_in, check_out)."""
    return and_(Booking.status == "confirmed", Booking.check_in < check_out, Booking.check_out > check_in)


def is_available(db: Session, listing_id: int, check_in: date, check_out: date) -> bool:
    conflict = select(Booking.id).where(Booking.listing_id == listing_id, overlaps(check_in, check_out))
    return not db.scalar(select(conflict.exists()))


def booked_ranges(db: Session, listing_id: int, start: date, end: date) -> list[tuple[date, date]]:
    rows = db.execute(
        select(Booking.check_in, Booking.check_out)
        .where(Booking.listing_id == listing_id, overlaps(start, end))
        .order_by(Booking.check_in)
    ).all()
    return [(row.check_in, row.check_out) for row in rows]


def quote_stay(db: Session, listing: Listing, stay: StayIn, today: date) -> PriceQuote:
    """Validate a proposed stay against every rule, then price it. Shared by /quote and POST /bookings."""
    validate_stay(stay.check_in, stay.check_out, today)
    if stay.adults + stay.children > listing.max_guests:
        raise AppError(422, "too_many_guests", f"This place has a maximum of {listing.max_guests} guests")
    if not is_available(db, listing.id, stay.check_in, stay.check_out):
        raise AppError(409, "dates_unavailable", "Those dates are not available")
    return quote(listing.nightly_price, listing.cleaning_fee, stay.check_in, stay.check_out)
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `.venv/Scripts/python -m pytest tests/test_stay.py`
Expected: `16 passed`

- [ ] **Step 5: Commit**

```bash
git add backend/app/schemas backend/app/services/stay.py backend/tests/test_stay.py
git commit -m "feat(backend): add stay validation, availability queries and quote_stay"
```

---

### Task 5: Mock demo-account authentication

**Files:**
- Create: `backend/app/core/auth.py`, `backend/app/schemas/user.py`, `backend/app/services/users.py`, `backend/app/routers/auth.py`
- Modify: `backend/app/routers/__init__.py`, `backend/tests/conftest.py` (add the `login` fixture)
- Test: `backend/tests/test_auth.py`

**Interfaces:**
- Consumes: `User`, `Listing`, `DbSession`, `AppError`.
- Produces: `CurrentUser` (Annotated `User`, raises 401) and `OptionalUser` (Annotated `User | None`); `SESSION_USER_KEY = "user_id"`; `UserOut(id, name, email, avatar_url, is_superhost, is_host)`; `to_user_out(db, user) -> UserOut`; endpoints `POST /api/auth/login {email}`, `POST /api/auth/logout`, `GET /api/auth/me`; test fixture `login(user)`.

- [ ] **Step 1: Write the failing tests**

Append to `backend/tests/conftest.py`:
```python
@pytest.fixture
def login(client):
    def _login(user) -> None:
        response = client.post("/api/auth/login", json={"email": user.email})
        assert response.status_code == 200, response.text

    return _login
```

`backend/tests/test_auth.py`:
```python
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `.venv/Scripts/python -m pytest tests/test_auth.py`
Expected: FAIL — `assert 404 == 200` (the login route doesn't exist yet)

- [ ] **Step 3: Implement**

`backend/app/schemas/user.py`:
```python
from pydantic import BaseModel, Field


class LoginIn(BaseModel):
    email: str = Field(min_length=3, max_length=255)


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    avatar_url: str | None
    is_superhost: bool
    is_host: bool  # owns at least one active listing


class PersonSummary(BaseModel):
    id: int
    name: str
    avatar_url: str | None
```

`backend/app/services/users.py`:
```python
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.models import Listing, User
from app.schemas.user import UserOut


def find_by_email(db: Session, email: str) -> User:
    user = db.scalar(select(User).where(User.email == email.strip().lower()))
    if user is None:
        raise AppError(404, "unknown_account", "No demo account uses that email")
    return user


def to_user_out(db: Session, user: User) -> UserOut:
    owns_listing = db.scalar(
        select(Listing.id).where(Listing.host_id == user.id, Listing.deleted_at.is_(None)).limit(1)
    ) is not None
    return UserOut(id=user.id, name=user.name, email=user.email, avatar_url=user.avatar_url,
                   is_superhost=user.is_superhost, is_host=owns_listing)
```

`backend/app/core/auth.py`:
```python
"""Mock authentication: the signed session cookie (Starlette SessionMiddleware) stores the user's id."""

from typing import Annotated

from fastapi import Depends, Request

from app.core.db import DbSession
from app.core.errors import AppError
from app.models import User

SESSION_USER_KEY = "user_id"


def optional_user(request: Request, db: DbSession) -> User | None:
    user_id = request.session.get(SESSION_USER_KEY)
    if user_id is None:
        return None
    user = db.get(User, user_id)
    if user is None:  # user vanished (e.g. database reseeded): drop the stale session
        request.session.clear()
    return user


def current_user(user: Annotated[User | None, Depends(optional_user)]) -> User:
    if user is None:
        raise AppError(401, "not_authenticated", "Log in to continue")
    return user


OptionalUser = Annotated[User | None, Depends(optional_user)]
CurrentUser = Annotated[User, Depends(current_user)]
```

`backend/app/routers/auth.py`:
```python
from fastapi import APIRouter, Request, Response

from app.core.auth import SESSION_USER_KEY, CurrentUser
from app.core.db import DbSession
from app.schemas.user import LoginIn, UserOut
from app.services import users as users_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=UserOut)
def login(body: LoginIn, request: Request, db: DbSession) -> UserOut:
    user = users_service.find_by_email(db, body.email)
    request.session[SESSION_USER_KEY] = user.id
    return users_service.to_user_out(db, user)


@router.post("/logout", status_code=204)
def logout(request: Request) -> Response:
    request.session.clear()
    return Response(status_code=204)


@router.get("/me", response_model=UserOut)
def me(user: CurrentUser, db: DbSession) -> UserOut:
    return users_service.to_user_out(db, user)
```

`backend/app/routers/__init__.py`:
```python
from app.routers import auth, health

ROUTERS = [health.router, auth.router]
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `.venv/Scripts/python -m pytest`
Expected: all pass (`39 passed`)

- [ ] **Step 5: Commit**

```bash
git add backend
git commit -m "feat(backend): add demo-account login with signed session cookie"
```

---

### Task 6: Catalog endpoints and listing search

**Files:**
- Create: `backend/app/destinations.py`, `backend/app/schemas/common.py`, `backend/app/schemas/listing.py`, `backend/app/services/listings.py`, `backend/app/routers/catalog.py`, `backend/app/routers/listings.py`
- Modify: `backend/app/routers/__init__.py`
- Test: `backend/tests/test_catalog.py`, `backend/tests/test_listings_search.py`

**Interfaces:**
- Consumes: `validate_stay`, `overlaps` (Task 4); `quote` (Task 3); `OptionalUser` (Task 5); `Today`.
- Produces: `Destination` and `DESTINATIONS`; `Page[T](items, page, page_size, total, has_more)`; `CategoryOut`, `AmenityOut`, `DestinationOut`, `StayPrice(nights, total)`; `ListingCard`; `ListingSearchParams`; in `services/listings.py`: `get_active_listing(db, listing_id) -> Listing`, `is_guest_favourite(listing) -> bool`, `wishlisted_ids(db, viewer, listing_ids) -> set[int]`, `cards_for(db, listings, viewer, stay=None) -> list[ListingCard]`, `search_listings(db, params, today, viewer) -> Page[ListingCard]`; endpoints `GET /api/categories`, `/api/amenities`, `/api/destinations`, `/api/listings`.

- [ ] **Step 1: Write the failing tests**

`backend/tests/test_catalog.py`:
```python
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
```

`backend/tests/test_listings_search.py`:
```python
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `.venv/Scripts/python -m pytest tests/test_catalog.py tests/test_listings_search.py`
Expected: FAIL — 404s on `/api/categories` and `/api/listings`

- [ ] **Step 3: Implement**

`backend/app/destinations.py`:
```python
"""The destinations the demo covers: used for 'Where' suggestions, the host form's location helper and the seed."""

from dataclasses import dataclass


@dataclass(frozen=True)
class Destination:
    name: str
    state: str
    country: str
    latitude: float
    longitude: float
    blurb: str


DESTINATIONS: tuple[Destination, ...] = (
    Destination("Goa", "Goa", "India", 15.4909, 73.8278, "Beaches, shacks and Portuguese villas"),
    Destination("Manali", "Himachal Pradesh", "India", 32.2432, 77.1892, "Snow peaks and pine forests"),
    Destination("Jaipur", "Rajasthan", "India", 26.9124, 75.7873, "Forts, havelis and bazaars"),
    Destination("Udaipur", "Rajasthan", "India", 24.5854, 73.7125, "Lakes and palaces"),
    Destination("Mumbai", "Maharashtra", "India", 19.0760, 72.8777, "For sights like Marine Drive"),
    Destination("Bengaluru", "Karnataka", "India", 12.9716, 77.5946, "Gardens, cafés and craft beer"),
    Destination("Alleppey", "Kerala", "India", 9.4981, 76.3388, "Backwaters and houseboats"),
    Destination("Munnar", "Kerala", "India", 10.0889, 77.0595, "Tea estates in the clouds"),
    Destination("Rishikesh", "Uttarakhand", "India", 30.0869, 78.2676, "Yoga, rafting and the Ganges"),
    Destination("Coorg", "Karnataka", "India", 12.3375, 75.8069, "Coffee plantations and waterfalls"),
    Destination("Puducherry", "Puducherry", "India", 11.9416, 79.8083, "French Quarter and seaside promenades"),
    Destination("Shimla", "Himachal Pradesh", "India", 31.1048, 77.1734, "Colonial hill-station charm"),
)
```

`backend/app/schemas/common.py`:
```python
from typing import Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class Page(BaseModel, Generic[T]):
    items: list[T]
    page: int
    page_size: int
    total: int
    has_more: bool
```

`backend/app/schemas/listing.py`:
```python
from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models import PropertyType, RoomType

SortOption = Literal["recommended", "price_asc", "price_desc", "rating"]


class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    slug: str
    name: str
    icon: str


class AmenityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    code: str
    name: str
    icon: str
    group_name: str


class DestinationOut(BaseModel):
    name: str
    state: str
    country: str
    latitude: float
    longitude: float
    blurb: str


class StayPrice(BaseModel):
    nights: int
    total: int  # all fees included, as the live site shows


class ListingCard(BaseModel):
    id: int
    title: str
    property_type: str
    room_type: str
    city: str
    state: str | None
    country: str
    latitude: float
    longitude: float
    bedrooms: int
    beds: int
    bathrooms: int
    max_guests: int
    nightly_price: int
    rating_avg: float | None
    review_count: int
    is_guest_favourite: bool
    photos: list[str]
    stay_price: StayPrice | None
    is_wishlisted: bool


class ListingSearchParams(BaseModel):
    model_config = ConfigDict(extra="forbid")

    location: str | None = Field(default=None, max_length=100)
    check_in: date | None = None
    check_out: date | None = None
    guests: int = Field(default=1, ge=1, le=16)
    category: str | None = Field(default=None, max_length=40)
    min_price: int | None = Field(default=None, ge=0)
    max_price: int | None = Field(default=None, ge=0)
    room_type: RoomType | None = None
    property_types: list[PropertyType] = Field(default_factory=list)
    amenities: list[str] = Field(default_factory=list)
    min_bedrooms: int = Field(default=0, ge=0, le=50)
    min_beds: int = Field(default=0, ge=0, le=50)
    min_bathrooms: int = Field(default=0, ge=0, le=50)
    sort: SortOption = "recommended"
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=24, ge=1, le=60)
```

`backend/app/services/listings.py`:
```python
from collections.abc import Sequence
from datetime import date

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.core.errors import AppError, not_found
from app.models import Amenity, Booking, Category, Listing, User, WishlistItem, listing_amenities
from app.schemas.common import Page
from app.schemas.listing import ListingCard, ListingSearchParams, StayPrice
from app.services.pricing import quote
from app.services.stay import overlaps, validate_stay

GUEST_FAVOURITE_MIN_RATING = 4.8
GUEST_FAVOURITE_MIN_REVIEWS = 3
CARD_PHOTO_LIMIT = 5

SORT_ORDERS = {
    "recommended": (Listing.rating_avg.desc().nulls_last(), Listing.review_count.desc(), Listing.id),
    "price_asc": (Listing.nightly_price.asc(), Listing.id),
    "price_desc": (Listing.nightly_price.desc(), Listing.id),
    "rating": (Listing.rating_avg.desc().nulls_last(), Listing.id),
}


def get_active_listing(db: Session, listing_id: int) -> Listing:
    listing = db.get(Listing, listing_id)
    if listing is None or listing.deleted_at is not None:
        raise not_found("Listing")
    return listing


def is_guest_favourite(listing: Listing) -> bool:
    return (listing.rating_avg or 0) >= GUEST_FAVOURITE_MIN_RATING and listing.review_count >= GUEST_FAVOURITE_MIN_REVIEWS


def wishlisted_ids(db: Session, viewer: User | None, listing_ids: Sequence[int]) -> set[int]:
    if viewer is None or not listing_ids:
        return set()
    return set(db.scalars(
        select(WishlistItem.listing_id).where(WishlistItem.user_id == viewer.id, WishlistItem.listing_id.in_(listing_ids))
    ))


def cards_for(db: Session, listings: Sequence[Listing], viewer: User | None,
              stay: tuple[date, date] | None = None) -> list[ListingCard]:
    saved = wishlisted_ids(db, viewer, [listing.id for listing in listings])
    cards = []
    for listing in listings:
        stay_price = None
        if stay is not None:
            price = quote(listing.nightly_price, listing.cleaning_fee, *stay)
            stay_price = StayPrice(nights=price.nights, total=price.total)
        cards.append(ListingCard(
            id=listing.id, title=listing.title, property_type=listing.property_type, room_type=listing.room_type,
            city=listing.city, state=listing.state, country=listing.country, latitude=listing.latitude,
            longitude=listing.longitude, bedrooms=listing.bedrooms, beds=listing.beds, bathrooms=listing.bathrooms,
            max_guests=listing.max_guests, nightly_price=listing.nightly_price, rating_avg=listing.rating_avg,
            review_count=listing.review_count, is_guest_favourite=is_guest_favourite(listing),
            photos=[photo.url for photo in listing.photos[:CARD_PHOTO_LIMIT]], stay_price=stay_price,
            is_wishlisted=listing.id in saved,
        ))
    return cards


def _requested_stay(params: ListingSearchParams, today: date) -> tuple[date, date] | None:
    if params.check_in is None and params.check_out is None:
        return None
    if params.check_in is None or params.check_out is None:
        raise AppError(422, "invalid_dates", "Provide both check-in and check-out dates")
    validate_stay(params.check_in, params.check_out, today)
    return params.check_in, params.check_out


def _conditions(params: ListingSearchParams, stay: tuple[date, date] | None) -> list:
    if params.min_price is not None and params.max_price is not None and params.min_price > params.max_price:
        raise AppError(422, "invalid_price_range", "Minimum price can't be above maximum price")

    conditions = [Listing.deleted_at.is_(None), Listing.max_guests >= params.guests]
    if params.location and params.location.strip():
        # "Goa, India" → match on "Goa"; the first part is the most specific.
        term = params.location.split(",")[0].strip()
        conditions.append(or_(
            Listing.city.icontains(term, autoescape=True),
            Listing.state.icontains(term, autoescape=True),
            Listing.country.icontains(term, autoescape=True),
        ))
    if params.category:
        conditions.append(Listing.categories.any(Category.slug == params.category))
    if params.min_price is not None:
        conditions.append(Listing.nightly_price >= params.min_price)
    if params.max_price is not None:
        conditions.append(Listing.nightly_price <= params.max_price)
    if params.room_type:
        conditions.append(Listing.room_type == params.room_type)
    if params.property_types:
        conditions.append(Listing.property_type.in_(params.property_types))
    if params.min_bedrooms:
        conditions.append(Listing.bedrooms >= params.min_bedrooms)
    if params.min_beds:
        conditions.append(Listing.beds >= params.min_beds)
    if params.min_bathrooms:
        conditions.append(Listing.bathrooms >= params.min_bathrooms)
    if params.amenities:
        codes = set(params.amenities)
        has_all_amenities = (
            select(listing_amenities.c.listing_id)
            .join(Amenity, Amenity.id == listing_amenities.c.amenity_id)
            .where(Amenity.code.in_(codes))
            .group_by(listing_amenities.c.listing_id)
            .having(func.count() == len(codes))
        )
        conditions.append(Listing.id.in_(has_all_amenities))
    if stay is not None:
        clash = select(Booking.id).where(Booking.listing_id == Listing.id, overlaps(*stay))
        conditions.append(~clash.exists())
    return conditions


def search_listings(db: Session, params: ListingSearchParams, today: date, viewer: User | None) -> Page[ListingCard]:
    stay = _requested_stay(params, today)
    conditions = _conditions(params, stay)
    total = db.scalar(select(func.count(Listing.id)).where(*conditions)) or 0
    rows = db.scalars(
        select(Listing)
        .where(*conditions)
        .order_by(*SORT_ORDERS[params.sort])
        .offset((params.page - 1) * params.page_size)
        .limit(params.page_size)
        .options(selectinload(Listing.photos))
    ).all()
    return Page[ListingCard](
        items=cards_for(db, rows, viewer, stay), page=params.page, page_size=params.page_size,
        total=total, has_more=params.page * params.page_size < total,
    )
```

`backend/app/routers/catalog.py`:
```python
from dataclasses import asdict

from fastapi import APIRouter
from sqlalchemy import select

from app.core.db import DbSession
from app.destinations import DESTINATIONS
from app.models import Amenity, Category
from app.schemas.listing import AmenityOut, CategoryOut, DestinationOut

router = APIRouter(tags=["catalog"])


@router.get("/categories", response_model=list[CategoryOut])
def list_categories(db: DbSession):
    return db.scalars(select(Category).order_by(Category.position, Category.id)).all()


@router.get("/amenities", response_model=list[AmenityOut])
def list_amenities(db: DbSession):
    return db.scalars(select(Amenity).order_by(Amenity.group_name, Amenity.name)).all()


@router.get("/destinations", response_model=list[DestinationOut])
def list_destinations() -> list[DestinationOut]:
    return [DestinationOut(**asdict(destination)) for destination in DESTINATIONS]
```

`backend/app/routers/listings.py`:
```python
from typing import Annotated

from fastapi import APIRouter, Query

from app.core.auth import OptionalUser
from app.core.clock import Today
from app.core.db import DbSession
from app.schemas.common import Page
from app.schemas.listing import ListingCard, ListingSearchParams
from app.services import listings as listings_service

router = APIRouter(prefix="/listings", tags=["listings"])


@router.get("", response_model=Page[ListingCard])
def search_listings(params: Annotated[ListingSearchParams, Query()], db: DbSession, viewer: OptionalUser, today: Today):
    return listings_service.search_listings(db, params, today, viewer)
```

`backend/app/routers/__init__.py`:
```python
from app.routers import auth, catalog, health, listings

ROUTERS = [health.router, auth.router, catalog.router, listings.router]
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `.venv/Scripts/python -m pytest`
Expected: all pass. If a price literal fails, recompute it from the pricing rules and fix the **test literal**, not the service.

- [ ] **Step 5: Commit**

```bash
git add backend
git commit -m "feat(backend): add catalog endpoints and availability-aware listing search"
```

---

### Task 7: Listing detail, availability, quote and reviews list

**Files:**
- Create: `backend/app/schemas/review.py`, `backend/app/services/reviews.py`
- Modify: `backend/app/schemas/listing.py` (add detail schemas), `backend/app/schemas/booking.py` (add `PriceQuoteOut`, `DateRange`, `AvailabilityOut`), `backend/app/services/listings.py` (add `get_listing_detail`), `backend/app/routers/listings.py`
- Test: `backend/tests/test_listing_detail.py`

**Interfaces:**
- Consumes: `get_active_listing`, `is_guest_favourite`, `wishlisted_ids` (Task 6); `quote_stay`, `booked_ranges`, `StayIn` (Task 4).
- Produces: `HostSummary`, `RatingBreakdown`, `ListingDetail`, `ReviewOut`, `PriceQuoteOut`, `DateRange`, `AvailabilityOut`; `get_listing_detail(db, listing_id, viewer) -> ListingDetail`; `rating_breakdown(db, listing_id) -> RatingBreakdown | None`; `list_reviews(db, listing_id, page, page_size) -> Page[ReviewOut]`; `to_review_out(review) -> ReviewOut`; endpoints `GET /api/listings/{id}`, `/{id}/availability`, `/{id}/quote`, `/{id}/reviews`.

- [ ] **Step 1: Write the failing tests**

`backend/tests/test_listing_detail.py`:
```python
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `.venv/Scripts/python -m pytest tests/test_listing_detail.py`
Expected: FAIL — 404 or 405 responses for the new routes

- [ ] **Step 3: Implement**

Append to `backend/app/schemas/listing.py`:
```python
class HostSummary(BaseModel):
    id: int
    name: str
    avatar_url: str | None
    bio: str | None
    is_superhost: bool
    hosting_since: date
    listing_count: int
    review_count: int
    rating_avg: float | None


class RatingBreakdown(BaseModel):
    cleanliness: float
    accuracy: float
    check_in: float
    communication: float
    location: float
    value: float


class ListingDetail(BaseModel):
    id: int
    title: str
    description: str
    property_type: str
    room_type: str
    max_guests: int
    bedrooms: int
    beds: int
    bathrooms: int
    nightly_price: int
    cleaning_fee: int
    address: str
    city: str
    state: str | None
    country: str
    latitude: float
    longitude: float
    rating_avg: float | None
    review_count: int
    is_guest_favourite: bool
    photos: list[str]
    amenities: list[AmenityOut]
    categories: list[CategoryOut]
    host: HostSummary
    rating_breakdown: RatingBreakdown | None
    is_wishlisted: bool
```

Append to `backend/app/schemas/booking.py`:
```python
class PriceQuoteOut(BaseModel):
    nightly_price: int
    nights: int
    subtotal: int
    cleaning_fee: int
    service_fee: int
    taxes: int
    total: int


class DateRange(BaseModel):
    check_in: date
    check_out: date


class AvailabilityOut(BaseModel):
    listing_id: int
    start: date
    end: date
    booked: list[DateRange]
```

`backend/app/schemas/review.py`:
```python
from datetime import datetime

from pydantic import BaseModel


class ReviewOut(BaseModel):
    id: int
    author_name: str
    author_avatar_url: str | None
    rating: int
    comment: str
    created_at: datetime
```

`backend/app/services/reviews.py`:
```python
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models import Booking, Review
from app.schemas.common import Page
from app.schemas.listing import RatingBreakdown
from app.schemas.review import ReviewOut


def to_review_out(review: Review) -> ReviewOut:
    author = review.booking.guest
    return ReviewOut(id=review.id, author_name=author.name, author_avatar_url=author.avatar_url,
                     rating=review.rating, comment=review.comment, created_at=review.created_at)


def _for_listing(listing_id: int):
    return select(Review).join(Booking, Booking.id == Review.booking_id).where(Booking.listing_id == listing_id)


def list_reviews(db: Session, listing_id: int, page: int, page_size: int) -> Page[ReviewOut]:
    total = db.scalar(select(func.count()).select_from(_for_listing(listing_id).subquery())) or 0
    rows = db.scalars(
        _for_listing(listing_id)
        .order_by(Review.created_at.desc(), Review.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .options(selectinload(Review.booking).selectinload(Booking.guest))
    ).all()
    return Page[ReviewOut](items=[to_review_out(r) for r in rows], page=page, page_size=page_size,
                           total=total, has_more=page * page_size < total)


def rating_breakdown(db: Session, listing_id: int) -> RatingBreakdown | None:
    row = db.execute(
        select(
            func.count(Review.id), func.avg(Review.cleanliness_rating), func.avg(Review.accuracy_rating),
            func.avg(Review.check_in_rating), func.avg(Review.communication_rating),
            func.avg(Review.location_rating), func.avg(Review.value_rating),
        ).join(Booking, Booking.id == Review.booking_id).where(Booking.listing_id == listing_id)
    ).one()
    if row[0] == 0:
        return None
    cleanliness, accuracy, check_in, communication, location, value = (round(float(v), 1) for v in row[1:])
    return RatingBreakdown(cleanliness=cleanliness, accuracy=accuracy, check_in=check_in,
                           communication=communication, location=location, value=value)
```

Append to `backend/app/services/listings.py` (and add `HostSummary`, `ListingDetail`, `AmenityOut`, `CategoryOut` to the `app.schemas.listing` import, plus `from app.services.reviews import rating_breakdown`):
```python
def _host_summary(db: Session, host: User) -> HostSummary:
    listing_count, review_count, weighted = db.execute(
        select(func.count(Listing.id), func.coalesce(func.sum(Listing.review_count), 0),
               func.sum(Listing.rating_avg * Listing.review_count))
        .where(Listing.host_id == host.id, Listing.deleted_at.is_(None))
    ).one()
    return HostSummary(
        id=host.id, name=host.name, avatar_url=host.avatar_url, bio=host.bio, is_superhost=host.is_superhost,
        hosting_since=host.created_at.date(), listing_count=listing_count, review_count=review_count,
        rating_avg=round(weighted / review_count, 2) if review_count else None,
    )


def get_listing_detail(db: Session, listing_id: int, viewer: User | None) -> ListingDetail:
    listing = get_active_listing(db, listing_id)
    return ListingDetail(
        id=listing.id, title=listing.title, description=listing.description, property_type=listing.property_type,
        room_type=listing.room_type, max_guests=listing.max_guests, bedrooms=listing.bedrooms, beds=listing.beds,
        bathrooms=listing.bathrooms, nightly_price=listing.nightly_price, cleaning_fee=listing.cleaning_fee,
        address=listing.address, city=listing.city, state=listing.state, country=listing.country,
        latitude=listing.latitude, longitude=listing.longitude, rating_avg=listing.rating_avg,
        review_count=listing.review_count, is_guest_favourite=is_guest_favourite(listing),
        photos=[photo.url for photo in listing.photos],
        amenities=[AmenityOut.model_validate(a) for a in sorted(listing.amenities, key=lambda a: (a.group_name, a.name))],
        categories=[CategoryOut.model_validate(c) for c in listing.categories],
        host=_host_summary(db, listing.host), rating_breakdown=rating_breakdown(db, listing.id),
        is_wishlisted=listing.id in wishlisted_ids(db, viewer, [listing.id]),
    )
```

Replace `backend/app/routers/listings.py` with:
```python
from dataclasses import asdict
from datetime import date, timedelta
from typing import Annotated

from fastapi import APIRouter, Query

from app.core.auth import OptionalUser
from app.core.clock import Today
from app.core.db import DbSession
from app.core.errors import AppError
from app.schemas.booking import AvailabilityOut, DateRange, PriceQuoteOut, StayIn
from app.schemas.common import Page
from app.schemas.listing import ListingCard, ListingDetail, ListingSearchParams
from app.schemas.review import ReviewOut
from app.services import listings as listings_service
from app.services import reviews as reviews_service
from app.services.stay import booked_ranges, quote_stay

router = APIRouter(prefix="/listings", tags=["listings"])

MAX_AVAILABILITY_WINDOW_DAYS = 400


@router.get("", response_model=Page[ListingCard])
def search_listings(params: Annotated[ListingSearchParams, Query()], db: DbSession, viewer: OptionalUser, today: Today):
    return listings_service.search_listings(db, params, today, viewer)


@router.get("/{listing_id}", response_model=ListingDetail)
def get_listing(listing_id: int, db: DbSession, viewer: OptionalUser):
    return listings_service.get_listing_detail(db, listing_id, viewer)


@router.get("/{listing_id}/availability", response_model=AvailabilityOut)
def get_availability(listing_id: int, db: DbSession, today: Today, start: date | None = None, end: date | None = None):
    listing = listings_service.get_active_listing(db, listing_id)
    start = start or today
    end = end or today + timedelta(days=365)
    if end <= start or (end - start).days > MAX_AVAILABILITY_WINDOW_DAYS:
        raise AppError(422, "invalid_window", f"end must be after start and within {MAX_AVAILABILITY_WINDOW_DAYS} days")
    ranges = booked_ranges(db, listing.id, start, end)
    return AvailabilityOut(listing_id=listing.id, start=start, end=end,
                           booked=[DateRange(check_in=a, check_out=b) for a, b in ranges])


@router.get("/{listing_id}/quote", response_model=PriceQuoteOut)
def get_quote(listing_id: int, stay: Annotated[StayIn, Query()], db: DbSession, today: Today):
    listing = listings_service.get_active_listing(db, listing_id)
    return PriceQuoteOut(**asdict(quote_stay(db, listing, stay, today)))


@router.get("/{listing_id}/reviews", response_model=Page[ReviewOut])
def get_reviews(listing_id: int, db: DbSession,
                page: Annotated[int, Query(ge=1)] = 1, page_size: Annotated[int, Query(ge=1, le=50)] = 10):
    listings_service.get_active_listing(db, listing_id)
    return reviews_service.list_reviews(db, listing_id, page, page_size)
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `.venv/Scripts/python -m pytest`
Expected: all pass

- [ ] **Step 5: Commit**

```bash
git add backend
git commit -m "feat(backend): add listing detail, availability, quote and reviews endpoints"
```

---

### Task 8: Bookings: create, trips, detail, cancel

**Files:**
- Create: `backend/app/services/bookings.py`, `backend/app/routers/bookings.py`
- Modify: `backend/app/schemas/booking.py` (add `BookingCreate`, `BookingListing`, `BookingOut`, `BookingPhase`), `backend/app/routers/__init__.py`
- Test: `backend/tests/test_bookings.py`

**Interfaces:**
- Consumes: `quote_stay` (Task 4); `get_active_listing` (Task 6); `CurrentUser` (Task 5); `PersonSummary` (Task 5).
- Produces: `BOOKING_LOAD` (loader options tuple); `phase_of(booking, today) -> str`; `to_booking_out(booking, today, viewer) -> BookingOut`; `create_booking(db, guest, body, today) -> BookingOut`; `list_trips(db, guest, today, phase) -> list[BookingOut]`; `get_booking_for(db, user, booking_id, today) -> BookingOut`; `cancel_booking(db, user, booking_id, today) -> BookingOut`; `load_booking(db, booking_id) -> Booking | None`; endpoints `POST /api/bookings`, `GET /api/bookings/mine`, `GET /api/bookings/{id}`, `POST /api/bookings/{id}/cancel`.

- [ ] **Step 1: Write the failing tests**

`backend/tests/test_bookings.py`:
```python
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `.venv/Scripts/python -m pytest tests/test_bookings.py`
Expected: FAIL — 404s on `/api/bookings`

- [ ] **Step 3: Implement**

Append to `backend/app/schemas/booking.py` (and change the file's imports to `from datetime import date, datetime`, `from typing import Literal`, `from pydantic import BaseModel, ConfigDict, Field`, `from app.schemas.user import PersonSummary`):
```python
BookingPhase = Literal["upcoming", "past", "cancelled"]


class BookingCreate(StayIn):
    model_config = ConfigDict(extra="forbid")  # the client can't smuggle in a price
    listing_id: int


class BookingListing(BaseModel):
    id: int
    title: str
    property_type: str
    room_type: str
    city: str
    state: str | None
    country: str
    photo_url: str | None
    host: PersonSummary


class BookingOut(BaseModel):
    id: int
    check_in: date
    check_out: date
    adults: int
    children: int
    infants: int
    status: str
    phase: BookingPhase
    nightly_price: int
    nights: int
    subtotal: int
    cleaning_fee: int
    service_fee: int
    taxes: int
    total: int
    created_at: datetime
    cancelled_at: datetime | None
    listing: BookingListing
    guest: PersonSummary
    can_cancel: bool
    can_review: bool
    has_review: bool
```

`backend/app/services/bookings.py`:
```python
from datetime import date, datetime, timezone

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.core.errors import AppError, not_found
from app.models import Booking, Listing, User
from app.schemas.booking import BookingCreate, BookingListing, BookingOut
from app.schemas.user import PersonSummary
from app.services.listings import get_active_listing
from app.services.stay import quote_stay

BOOKING_LOAD = (
    selectinload(Booking.listing).selectinload(Listing.photos),
    selectinload(Booking.listing).selectinload(Listing.host),
    selectinload(Booking.guest),
    selectinload(Booking.review),
)


def _person(user: User) -> PersonSummary:
    return PersonSummary(id=user.id, name=user.name, avatar_url=user.avatar_url)


def phase_of(booking: Booking, today: date) -> str:
    if booking.status == "cancelled":
        return "cancelled"
    return "upcoming" if booking.check_out > today else "past"


def _can_cancel(booking: Booking, today: date) -> bool:
    return booking.status == "confirmed" and booking.check_in > today


def to_booking_out(booking: Booking, today: date, viewer: User) -> BookingOut:
    listing = booking.listing
    phase = phase_of(booking, today)
    return BookingOut(
        id=booking.id, check_in=booking.check_in, check_out=booking.check_out, adults=booking.adults,
        children=booking.children, infants=booking.infants, status=booking.status, phase=phase,
        nightly_price=booking.nightly_price, nights=booking.nights, subtotal=booking.nightly_price * booking.nights,
        cleaning_fee=booking.cleaning_fee, service_fee=booking.service_fee, taxes=booking.taxes, total=booking.total,
        created_at=booking.created_at, cancelled_at=booking.cancelled_at,
        listing=BookingListing(
            id=listing.id, title=listing.title, property_type=listing.property_type, room_type=listing.room_type,
            city=listing.city, state=listing.state, country=listing.country,
            photo_url=listing.photos[0].url if listing.photos else None, host=_person(listing.host),
        ),
        guest=_person(booking.guest),
        can_cancel=_can_cancel(booking, today),
        can_review=phase == "past" and booking.review is None and viewer.id == booking.guest_id,
        has_review=booking.review is not None,
    )


def load_booking(db: Session, booking_id: int) -> Booking | None:
    return db.scalar(select(Booking).where(Booking.id == booking_id).options(*BOOKING_LOAD))


def create_booking(db: Session, guest: User, body: BookingCreate, today: date) -> BookingOut:
    listing = get_active_listing(db, body.listing_id)
    if listing.host_id == guest.id:
        raise AppError(403, "own_listing", "You can't book your own listing")
    price = quote_stay(db, listing, body, today)
    booking = Booking(
        listing_id=listing.id, guest_id=guest.id, check_in=body.check_in, check_out=body.check_out,
        adults=body.adults, children=body.children, infants=body.infants, status="confirmed",
        nightly_price=price.nightly_price, nights=price.nights, cleaning_fee=price.cleaning_fee,
        service_fee=price.service_fee, taxes=price.taxes, total=price.total,
    )
    db.add(booking)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        if "booking_overlap" in str(exc.orig):  # another request won the race (database trigger)
            raise AppError(409, "dates_unavailable", "Those dates were just booked by someone else") from exc
        raise
    return to_booking_out(load_booking(db, booking.id), today, guest)


def list_trips(db: Session, guest: User, today: date, phase: str | None) -> list[BookingOut]:
    rows = db.scalars(
        select(Booking).where(Booking.guest_id == guest.id).options(*BOOKING_LOAD).order_by(Booking.check_in, Booking.id)
    ).all()
    trips = [to_booking_out(booking, today, guest) for booking in rows]
    return [trip for trip in trips if phase is None or trip.phase == phase]


def _visible_booking(db: Session, user: User, booking_id: int) -> Booking:
    booking = load_booking(db, booking_id)
    if booking is None or user.id not in (booking.guest_id, booking.listing.host_id):
        raise not_found("Booking")  # 404 rather than 403: don't reveal other people's bookings
    return booking


def get_booking_for(db: Session, user: User, booking_id: int, today: date) -> BookingOut:
    return to_booking_out(_visible_booking(db, user, booking_id), today, user)


def cancel_booking(db: Session, user: User, booking_id: int, today: date) -> BookingOut:
    booking = _visible_booking(db, user, booking_id)
    if not _can_cancel(booking, today):
        raise AppError(409, "cannot_cancel", "Only upcoming stays that haven't started can be cancelled")
    booking.status = "cancelled"
    booking.cancelled_at = datetime.now(timezone.utc)
    db.commit()
    return to_booking_out(booking, today, user)
```

`backend/app/routers/bookings.py`:
```python
from fastapi import APIRouter

from app.core.auth import CurrentUser
from app.core.clock import Today
from app.core.db import DbSession
from app.schemas.booking import BookingCreate, BookingOut, BookingPhase
from app.services import bookings as bookings_service

router = APIRouter(prefix="/bookings", tags=["bookings"])


@router.post("", response_model=BookingOut, status_code=201)
def create_booking(body: BookingCreate, user: CurrentUser, db: DbSession, today: Today):
    return bookings_service.create_booking(db, user, body, today)


@router.get("/mine", response_model=list[BookingOut])
def my_trips(user: CurrentUser, db: DbSession, today: Today, phase: BookingPhase | None = None):
    return bookings_service.list_trips(db, user, today, phase)


@router.get("/{booking_id}", response_model=BookingOut)
def get_booking(booking_id: int, user: CurrentUser, db: DbSession, today: Today):
    return bookings_service.get_booking_for(db, user, booking_id, today)


@router.post("/{booking_id}/cancel", response_model=BookingOut)
def cancel_booking(booking_id: int, user: CurrentUser, db: DbSession, today: Today):
    return bookings_service.cancel_booking(db, user, booking_id, today)
```

`backend/app/routers/__init__.py`:
```python
from app.routers import auth, bookings, catalog, health, listings

ROUTERS = [health.router, auth.router, catalog.router, listings.router, bookings.router]
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `.venv/Scripts/python -m pytest`
Expected: all pass

- [ ] **Step 5: Commit**

```bash
git add backend
git commit -m "feat(backend): add booking creation, trips, detail and cancellation"
```

---

### Task 9: Wishlist

**Files:**
- Create: `backend/app/services/wishlist.py`, `backend/app/routers/wishlist.py`
- Modify: `backend/app/routers/__init__.py`
- Test: `backend/tests/test_wishlist.py`

**Interfaces:**
- Consumes: `get_active_listing`, `cards_for` (Task 6).
- Produces: `save(db, user, listing_id) -> None`, `unsave(db, user, listing_id) -> None`, `list_saved(db, user) -> list[ListingCard]`; endpoints `GET /api/wishlist`, `PUT /api/wishlist/{listing_id}`, `DELETE /api/wishlist/{listing_id}`.

- [ ] **Step 1: Write the failing tests**

`backend/tests/test_wishlist.py`:
```python
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `.venv/Scripts/python -m pytest tests/test_wishlist.py`
Expected: FAIL — 404 instead of 401 on `/api/wishlist`

- [ ] **Step 3: Implement**

`backend/app/services/wishlist.py`:
```python
from sqlalchemy import delete, select
from sqlalchemy.orm import Session, selectinload

from app.models import Listing, User, WishlistItem
from app.schemas.listing import ListingCard
from app.services.listings import cards_for, get_active_listing


def save(db: Session, user: User, listing_id: int) -> None:
    get_active_listing(db, listing_id)
    if db.get(WishlistItem, (user.id, listing_id)) is None:
        db.add(WishlistItem(user_id=user.id, listing_id=listing_id))
        db.commit()


def unsave(db: Session, user: User, listing_id: int) -> None:
    db.execute(delete(WishlistItem).where(WishlistItem.user_id == user.id, WishlistItem.listing_id == listing_id))
    db.commit()


def list_saved(db: Session, user: User) -> list[ListingCard]:
    rows = db.scalars(
        select(Listing)
        .join(WishlistItem, WishlistItem.listing_id == Listing.id)
        .where(WishlistItem.user_id == user.id, Listing.deleted_at.is_(None))
        .order_by(WishlistItem.created_at.desc(), Listing.id.desc())
        .options(selectinload(Listing.photos))
    ).all()
    return cards_for(db, rows, user)
```

`backend/app/routers/wishlist.py`:
```python
from fastapi import APIRouter, Response

from app.core.auth import CurrentUser
from app.core.db import DbSession
from app.schemas.listing import ListingCard
from app.services import wishlist as wishlist_service

router = APIRouter(prefix="/wishlist", tags=["wishlist"])


@router.get("", response_model=list[ListingCard])
def list_saved(user: CurrentUser, db: DbSession):
    return wishlist_service.list_saved(db, user)


@router.put("/{listing_id}", status_code=204)
def save(listing_id: int, user: CurrentUser, db: DbSession) -> Response:
    wishlist_service.save(db, user, listing_id)
    return Response(status_code=204)


@router.delete("/{listing_id}", status_code=204)
def unsave(listing_id: int, user: CurrentUser, db: DbSession) -> Response:
    wishlist_service.unsave(db, user, listing_id)
    return Response(status_code=204)
```

`backend/app/routers/__init__.py`:
```python
from app.routers import auth, bookings, catalog, health, listings, wishlist

ROUTERS = [health.router, auth.router, catalog.router, listings.router, bookings.router, wishlist.router]
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `.venv/Scripts/python -m pytest`
Expected: all pass

- [ ] **Step 5: Commit**

```bash
git add backend
git commit -m "feat(backend): add wishlist save, unsave and list"
```

---

### Task 10: Host listing CRUD

**Files:**
- Create: `backend/app/services/host.py`, `backend/app/routers/host.py`
- Modify: `backend/app/schemas/listing.py` (add `ListingWrite`, `HostListingOut`), `backend/app/routers/__init__.py`
- Test: `backend/tests/test_host_listings.py`

**Interfaces:**
- Consumes: `get_listing_detail`, `cards_for` (Tasks 6–7); `CurrentUser`; `Today`.
- Produces: `ListingWrite`; `HostListingOut(ListingCard + upcoming_reservations: int)`; `get_owned_listing(db, host, listing_id) -> Listing`; `create_listing(db, host, body) -> ListingDetail`; `update_listing(db, host, listing_id, body) -> ListingDetail`; `delete_listing(db, host, listing_id, today) -> None`; `host_listings(db, host, today) -> list[HostListingOut]`; endpoints `GET/POST /api/host/listings`, `PUT/DELETE /api/host/listings/{id}`.

- [ ] **Step 1: Write the failing tests**

`backend/tests/test_host_listings.py`:
```python
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `.venv/Scripts/python -m pytest tests/test_host_listings.py`
Expected: FAIL — 404s on `/api/host/listings`

- [ ] **Step 3: Implement**

Append to `backend/app/schemas/listing.py` (and add `Annotated` to the `typing` import and `StringConstraints` to the `pydantic` import):
```python
PhotoUrl = Annotated[str, StringConstraints(strip_whitespace=True, pattern=r"^https?://\S+$", max_length=500)]


class ListingWrite(BaseModel):
    """Everything a host edits. PUT replaces all of it, including photos, amenities and categories."""

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    title: str = Field(min_length=5, max_length=100)
    description: str = Field(min_length=20, max_length=5000)
    property_type: PropertyType
    room_type: RoomType
    max_guests: int = Field(ge=1, le=16)
    bedrooms: int = Field(ge=0, le=50)
    beds: int = Field(ge=1, le=50)
    bathrooms: int = Field(ge=0, le=50)
    nightly_price: int = Field(ge=100, le=1_000_000)
    cleaning_fee: int = Field(default=0, ge=0, le=100_000)
    address: str = Field(min_length=3, max_length=200)
    city: str = Field(min_length=1, max_length=80)
    state: str | None = Field(default=None, max_length=80)
    country: str = Field(min_length=2, max_length=80)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    photo_urls: list[PhotoUrl] = Field(min_length=1, max_length=20)
    amenity_codes: list[str] = Field(default_factory=list, max_length=60)
    category_slugs: list[str] = Field(default_factory=list, max_length=10)


class HostListingOut(ListingCard):
    upcoming_reservations: int
```

`backend/app/services/host.py`:
```python
from datetime import date, datetime, timezone

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session, selectinload

from app.core.errors import AppError, not_found
from app.models import Amenity, Booking, Category, Listing, ListingPhoto, User, WishlistItem
from app.schemas.listing import HostListingOut, ListingDetail, ListingWrite
from app.services.listings import cards_for, get_listing_detail

SCALAR_FIELDS = (
    "title", "description", "property_type", "room_type", "max_guests", "bedrooms", "beds", "bathrooms",
    "nightly_price", "cleaning_fee", "address", "city", "state", "country", "latitude", "longitude",
)


def get_owned_listing(db: Session, host: User, listing_id: int) -> Listing:
    listing = db.get(Listing, listing_id)
    if listing is None or listing.deleted_at is not None:
        raise not_found("Listing")
    if listing.host_id != host.id:
        raise AppError(403, "not_owner", "You can only manage your own listings")
    return listing


def _lookup(db: Session, model, key_column, keys: list[str], code: str, label: str) -> list:
    wanted = set(keys)
    rows = db.scalars(select(model).where(key_column.in_(wanted))).all()
    missing = wanted - {getattr(row, key_column.key) for row in rows}
    if missing:
        raise AppError(422, code, f"Unknown {label}: {', '.join(sorted(missing))}")
    return list(rows)


def _apply(db: Session, listing: Listing, body: ListingWrite) -> None:
    for field in SCALAR_FIELDS:
        setattr(listing, field, getattr(body, field))
    listing.amenities = _lookup(db, Amenity, Amenity.code, body.amenity_codes, "unknown_amenity", "amenity")
    listing.categories = _lookup(db, Category, Category.slug, body.category_slugs, "unknown_category", "category")
    if listing.photos:
        # Delete the old rows first so UNIQUE(listing_id, position) isn't hit by the new ones.
        listing.photos.clear()
        db.flush()
    listing.photos = [ListingPhoto(url=url, position=i) for i, url in enumerate(body.photo_urls)]


def create_listing(db: Session, host: User, body: ListingWrite) -> ListingDetail:
    listing = Listing(host_id=host.id)
    _apply(db, listing, body)
    db.add(listing)
    db.commit()
    return get_listing_detail(db, listing.id, host)


def update_listing(db: Session, host: User, listing_id: int, body: ListingWrite) -> ListingDetail:
    listing = get_owned_listing(db, host, listing_id)
    _apply(db, listing, body)
    db.commit()
    return get_listing_detail(db, listing.id, host)


def delete_listing(db: Session, host: User, listing_id: int, today: date) -> None:
    listing = get_owned_listing(db, host, listing_id)
    upcoming = db.scalar(
        select(func.count(Booking.id)).where(
            Booking.listing_id == listing.id, Booking.status == "confirmed", Booking.check_out > today
        )
    )
    if upcoming:
        raise AppError(409, "has_upcoming_bookings",
                       f"This listing has {upcoming} upcoming reservation(s). Cancel them before deleting it.")
    listing.deleted_at = datetime.now(timezone.utc)  # soft delete: past trips keep their listing
    db.execute(delete(WishlistItem).where(WishlistItem.listing_id == listing.id))
    db.commit()


def host_listings(db: Session, host: User, today: date) -> list[HostListingOut]:
    rows = db.scalars(
        select(Listing)
        .where(Listing.host_id == host.id, Listing.deleted_at.is_(None))
        .order_by(Listing.created_at.desc(), Listing.id.desc())
        .options(selectinload(Listing.photos))
    ).all()
    upcoming = dict(db.execute(
        select(Booking.listing_id, func.count(Booking.id))
        .where(Booking.listing_id.in_([l.id for l in rows]), Booking.status == "confirmed", Booking.check_out > today)
        .group_by(Booking.listing_id)
    ).all())
    return [HostListingOut(**card.model_dump(), upcoming_reservations=upcoming.get(card.id, 0))
            for card in cards_for(db, rows, host)]
```

`backend/app/routers/host.py`:
```python
from fastapi import APIRouter, Response

from app.core.auth import CurrentUser
from app.core.clock import Today
from app.core.db import DbSession
from app.schemas.listing import HostListingOut, ListingDetail, ListingWrite
from app.services import host as host_service

router = APIRouter(prefix="/host", tags=["host"])


@router.get("/listings", response_model=list[HostListingOut])
def my_listings(user: CurrentUser, db: DbSession, today: Today):
    return host_service.host_listings(db, user, today)


@router.post("/listings", response_model=ListingDetail, status_code=201)
def create_listing(body: ListingWrite, user: CurrentUser, db: DbSession):
    return host_service.create_listing(db, user, body)


@router.put("/listings/{listing_id}", response_model=ListingDetail)
def update_listing(listing_id: int, body: ListingWrite, user: CurrentUser, db: DbSession):
    return host_service.update_listing(db, user, listing_id, body)


@router.delete("/listings/{listing_id}", status_code=204)
def delete_listing(listing_id: int, user: CurrentUser, db: DbSession, today: Today) -> Response:
    host_service.delete_listing(db, user, listing_id, today)
    return Response(status_code=204)
```

`backend/app/routers/__init__.py`:
```python
from app.routers import auth, bookings, catalog, health, host, listings, wishlist

ROUTERS = [health.router, auth.router, catalog.router, listings.router, bookings.router, wishlist.router, host.router]
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `.venv/Scripts/python -m pytest`
Expected: all pass

- [ ] **Step 5: Commit**

```bash
git add backend
git commit -m "feat(backend): add host listing create, update, soft delete and dashboard list"
```

---

### Task 11: Host reservations

**Files:**
- Modify: `backend/app/services/host.py`, `backend/app/routers/host.py`
- Test: `backend/tests/test_host_reservations.py`

**Interfaces:**
- Consumes: `BOOKING_LOAD`, `to_booking_out` (Task 8).
- Produces: `host_reservations(db, host, today, phase) -> list[BookingOut]`; endpoint `GET /api/host/reservations?phase=`.

- [ ] **Step 1: Write the failing test**

`backend/tests/test_host_reservations.py`:
```python
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `.venv/Scripts/python -m pytest tests/test_host_reservations.py`
Expected: FAIL — 404 on `/api/host/reservations`

- [ ] **Step 3: Implement**

Append to `backend/app/services/host.py` (and add `from app.schemas.booking import BookingOut` and `from app.services.bookings import BOOKING_LOAD, to_booking_out` to its imports):
```python
def host_reservations(db: Session, host: User, today: date, phase: str | None) -> list[BookingOut]:
    rows = db.scalars(
        select(Booking)
        .join(Listing, Listing.id == Booking.listing_id)
        .where(Listing.host_id == host.id)  # includes soft-deleted listings: history stays visible
        .options(*BOOKING_LOAD)
        .order_by(Booking.check_in, Booking.id)
    ).all()
    reservations = [to_booking_out(booking, today, host) for booking in rows]
    return [r for r in reservations if phase is None or r.phase == phase]
```

Append to `backend/app/routers/host.py` (and add `from app.schemas.booking import BookingOut, BookingPhase`):
```python
@router.get("/reservations", response_model=list[BookingOut])
def reservations(user: CurrentUser, db: DbSession, today: Today, phase: BookingPhase | None = None):
    return host_service.host_reservations(db, user, today, phase)
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `.venv/Scripts/python -m pytest`
Expected: all pass

- [ ] **Step 5: Commit**

```bash
git add backend
git commit -m "feat(backend): add host reservations list"
```

---

### Task 12: Reviews after a completed stay

**Files:**
- Modify: `backend/app/schemas/review.py` (add `ReviewCreate`), `backend/app/services/reviews.py` (add `recompute_listing_rating`, `create_review`), `backend/app/routers/bookings.py`
- Test: `backend/tests/test_reviews.py`

**Interfaces:**
- Consumes: `load_booking` (Task 8); `to_review_out` (Task 7).
- Produces: `ReviewCreate(rating, cleanliness, accuracy, check_in, communication, location, value, comment)`; `recompute_listing_rating(db, listing_id) -> None` (flushes, doesn't commit); `create_review(db, author, booking_id, body, today) -> ReviewOut`; endpoint `POST /api/bookings/{id}/review`.

- [ ] **Step 1: Write the failing tests**

`backend/tests/test_reviews.py`:
```python
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `.venv/Scripts/python -m pytest tests/test_reviews.py`
Expected: FAIL — 404/405 on `/review`

- [ ] **Step 3: Implement**

Append to `backend/app/schemas/review.py` (and add `from typing import Annotated` and `from pydantic import Field`):
```python
Stars = Annotated[int, Field(ge=1, le=5)]


class ReviewCreate(BaseModel):
    rating: Stars
    cleanliness: Stars
    accuracy: Stars
    check_in: Stars
    communication: Stars
    location: Stars
    value: Stars
    comment: str = Field(min_length=10, max_length=2000)
```

Append to `backend/app/services/reviews.py` (and add `from datetime import date`, `from sqlalchemy.exc import IntegrityError`, `from app.core.errors import AppError, not_found`, `from app.models import Listing, User`, `from app.schemas.review import ReviewCreate`):
```python
def recompute_listing_rating(db: Session, listing_id: int) -> None:
    """Refresh the listing's cached rating_avg/review_count from its reviews (the source of truth)."""
    db.flush()
    average, count = db.execute(
        select(func.avg(Review.rating), func.count(Review.id))
        .join(Booking, Booking.id == Review.booking_id)
        .where(Booking.listing_id == listing_id)
    ).one()
    listing = db.get(Listing, listing_id)
    listing.rating_avg = round(float(average), 2) if count else None
    listing.review_count = count


def create_review(db: Session, author: User, booking_id: int, body: ReviewCreate, today: date) -> ReviewOut:
    from app.services.bookings import load_booking  # local import avoids the cycle bookings → listings → reviews

    booking = load_booking(db, booking_id)
    if booking is None or booking.guest_id != author.id:
        raise not_found("Booking")
    if booking.status != "confirmed":
        raise AppError(409, "not_reviewable", "Cancelled stays can't be reviewed")
    if booking.check_out > today:
        raise AppError(409, "stay_not_finished", "You can review this stay after check-out")
    if booking.review is not None:
        raise AppError(409, "already_reviewed", "You've already reviewed this stay")

    review = Review(
        booking_id=booking.id, rating=body.rating, cleanliness_rating=body.cleanliness,
        accuracy_rating=body.accuracy, check_in_rating=body.check_in, communication_rating=body.communication,
        location_rating=body.location, value_rating=body.value, comment=body.comment,
    )
    db.add(review)
    recompute_listing_rating(db, booking.listing_id)
    try:
        db.commit()
    except IntegrityError as exc:  # UNIQUE(booking_id) — a concurrent duplicate submit
        db.rollback()
        raise AppError(409, "already_reviewed", "You've already reviewed this stay") from exc
    db.refresh(review)
    return to_review_out(review)
```

Append to `backend/app/routers/bookings.py` (and add `from app.schemas.review import ReviewCreate, ReviewOut` and `from app.services import reviews as reviews_service`):
```python
@router.post("/{booking_id}/review", response_model=ReviewOut, status_code=201)
def review_stay(booking_id: int, body: ReviewCreate, user: CurrentUser, db: DbSession, today: Today):
    return reviews_service.create_review(db, user, booking_id, body, today)
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `.venv/Scripts/python -m pytest`
Expected: all pass

- [ ] **Step 5: Commit**

```bash
git add backend
git commit -m "feat(backend): add reviews after completed stays with rating aggregation"
```

---

### Task 13: Deterministic seed data

**Files:**
- Create: `backend/app/seed/__init__.py` (empty), `backend/app/seed/data.py`, `backend/app/seed/photos.py`, `backend/app/seed/run.py`, `backend/app/seed/__main__.py`, `backend/scripts/check_photos.py`
- Modify: `backend/app/core/config.py` (`seed_on_startup` default → `True`)
- Test: `backend/tests/test_seed.py`

**Interfaces:**
- Consumes: every model; `quote` (Task 3); `recompute_listing_rating` (Task 12); `DESTINATIONS` (Task 6).
- Produces: `seed(db, today) -> None`; `seed_if_empty(db, today) -> bool`; `DEMO_GUEST_EMAIL = "ananya@example.com"`; `DEMO_HOST_EMAIL = "rahul@example.com"`; CLI `python -m app.seed [--reset]`.

- [ ] **Step 1: Curate the photo pools (data step)**

Fill `backend/app/seed/photos.py` with real Unsplash photo URLs (Unsplash License permits free use and hotlinking from `images.unsplash.com`). Use the built-in browser to search unsplash.com for each theme. Open a photo and copy the image URL. Normalise every URL to `https://images.unsplash.com/photo-<id>?auto=format&fit=crop&w=1200&q=80`. **Skip Unsplash+ (premium) photos**; their URLs start with `plus.unsplash.com`. Minimum pool sizes: each exterior theme ≥ 6, each interior pool ≥ 12.

```python
"""Curated Unsplash photos (Unsplash License). Exterior pools are chosen by destination theme."""

EXTERIOR: dict[str, list[str]] = {
    "beach": [...],        # beach houses, villas with pools, palm-fringed cottages
    "mountain": [...],     # wooden cabins, snow-view chalets, pine forests
    "heritage": [...],     # havelis, courtyards, palace-style facades
    "lake": [...],         # lakefront homes, houseboats, backwaters
    "city": [...],         # apartment buildings, skyline balconies
    "countryside": [...],  # plantation bungalows, farmhouses, tea estates
}
INTERIOR: dict[str, list[str]] = {
    "living": [...],
    "bedroom": [...],
    "bathroom": [...],
    "kitchen": [...],
}
```

Create `backend/scripts/check_photos.py` and run it; every URL must return 200:
```python
"""One-off check that every seed photo URL resolves. Run: python scripts/check_photos.py"""

import sys
import urllib.request

from app.seed.photos import EXTERIOR, INTERIOR

failures = 0
for pool in (*EXTERIOR.values(), *INTERIOR.values()):
    for url in pool:
        request = urllib.request.Request(url, method="HEAD", headers={"User-Agent": "seed-check"})
        try:
            with urllib.request.urlopen(request, timeout=15) as response:
                ok = response.status == 200
        except Exception:  # noqa: BLE001 — report and continue
            ok = False
        if not ok:
            failures += 1
            print("BROKEN", url)
print("all photos OK" if not failures else f"{failures} broken")
sys.exit(1 if failures else 0)
```
Run: `.venv/Scripts/python scripts/check_photos.py` (from `backend/`, with `PYTHONPATH=.`)
Expected: `all photos OK`

- [ ] **Step 2: Write the failing tests**

`backend/tests/test_seed.py`:
```python
from sqlalchemy import func, select

from app.models import Booking, Listing, Review, User, WishlistItem
from app.seed.data import DEMO_GUEST_EMAIL, DEMO_HOST_EMAIL
from app.seed.photos import EXTERIOR, INTERIOR
from app.seed.run import seed, seed_if_empty
from app.services.bookings import phase_of
from tests.conftest import TODAY


def test_photo_pools_are_well_formed():
    urls = [u for pool in (*EXTERIOR.values(), *INTERIOR.values()) for u in pool]
    assert all(u.startswith("https://images.unsplash.com/photo-") for u in urls)
    assert len(urls) == len(set(urls))
    assert all(len(p) >= 6 for p in EXTERIOR.values()) and all(len(p) >= 12 for p in INTERIOR.values())


def test_seed_builds_a_usable_demo_world(db):
    seed(db, TODAY)
    listings = db.scalars(select(Listing)).all()
    assert len(listings) == 48
    assert all(len(l.photos) == 5 and 5 <= len(l.amenities) <= 12 and l.categories for l in listings)

    host = db.scalar(select(User).where(User.email == DEMO_HOST_EMAIL))
    assert host.is_superhost and sum(1 for l in listings if l.host_id == host.id) == 8
    host_upcoming = db.scalar(select(func.count(Booking.id)).join(Listing).where(
        Listing.host_id == host.id, Booking.status == "confirmed", Booking.check_out > TODAY))
    assert host_upcoming >= 3

    guest = db.scalar(select(User).where(User.email == DEMO_GUEST_EMAIL))
    trips = db.scalars(select(Booking).where(Booking.guest_id == guest.id)).all()
    phases = [phase_of(b, TODAY) for b in trips]
    assert phases.count("upcoming") == 2 and phases.count("past") == 2 and phases.count("cancelled") == 1
    assert sum(1 for b in trips if phase_of(b, TODAY) == "past" and b.review is None) == 1
    assert db.scalar(select(func.count()).select_from(WishlistItem).where(WishlistItem.user_id == guest.id)) == 3

    assert db.scalar(select(func.count(Review.id))) >= 100


def test_seed_cached_ratings_match_reviews(db):
    seed(db, TODAY)
    for listing in db.scalars(select(Listing)).all():
        count = db.scalar(select(func.count(Review.id)).join(Booking).where(Booking.listing_id == listing.id))
        assert listing.review_count == count


def test_seed_prices_follow_pricing_rules(db):
    seed(db, TODAY)
    for b in db.scalars(select(Booking)).all():
        assert b.total == b.nightly_price * b.nights + b.cleaning_fee + b.service_fee + b.taxes
        assert b.nights == (b.check_out - b.check_in).days


def test_seed_if_empty_runs_once(db):
    assert seed_if_empty(db, TODAY) is True
    assert seed_if_empty(db, TODAY) is False
    assert db.scalar(select(func.count(Listing.id))) == 48
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `.venv/Scripts/python -m pytest tests/test_seed.py`
Expected: ERROR — `ModuleNotFoundError: No module named 'app.seed.data'`

- [ ] **Step 4: Implement the seed**

`backend/app/seed/data.py`:
```python
"""Static demo content. Everything random is derived from these tables with a fixed seed in run.py."""

from dataclasses import dataclass

DEMO_GUEST_EMAIL = "ananya@example.com"
DEMO_HOST_EMAIL = "rahul@example.com"

# (code, name, icon, group)
AMENITIES = [
    ("wifi", "Wifi", "wifi", "Essentials"), ("kitchen", "Kitchen", "cooking-pot", "Essentials"),
    ("washer", "Washing machine", "washing-machine", "Essentials"),
    ("air_conditioning", "Air conditioning", "air-vent", "Essentials"), ("heating", "Heating", "heater", "Essentials"),
    ("dedicated_workspace", "Dedicated workspace", "laptop", "Essentials"), ("tv", "TV", "tv", "Essentials"),
    ("hair_dryer", "Hair dryer", "wind", "Essentials"), ("iron", "Iron", "shirt", "Essentials"),
    ("hot_water", "Hot water", "droplets", "Essentials"), ("self_check_in", "Self check-in", "key-round", "Essentials"),
    ("pool", "Pool", "waves", "Features"), ("hot_tub", "Hot tub", "bath", "Features"),
    ("free_parking", "Free parking on premises", "car", "Features"), ("ev_charger", "EV charger", "plug-zap", "Features"),
    ("gym", "Gym", "dumbbell", "Features"), ("bbq_grill", "BBQ grill", "flame", "Features"),
    ("breakfast", "Breakfast", "coffee", "Features"), ("indoor_fireplace", "Indoor fireplace", "flame-kindling", "Features"),
    ("beach_access", "Beach access", "umbrella", "Location"), ("waterfront", "Waterfront", "sailboat", "Location"),
    ("mountain_view", "Mountain view", "mountain", "Location"),
    ("smoke_alarm", "Smoke alarm", "alarm-smoke", "Safety"), ("first_aid_kit", "First aid kit", "briefcase-medical", "Safety"),
    ("fire_extinguisher", "Fire extinguisher", "fire-extinguisher", "Safety"),
]
ALWAYS_AMENITIES = ["wifi", "hot_water", "smoke_alarm"]
OPTIONAL_AMENITIES = ["kitchen", "washer", "air_conditioning", "dedicated_workspace", "tv", "hair_dryer", "iron",
                      "self_check_in", "free_parking", "bbq_grill", "breakfast", "first_aid_kit", "fire_extinguisher"]
THEME_AMENITIES = {
    "beach": ["beach_access", "air_conditioning"], "mountain": ["heating", "mountain_view", "indoor_fireplace"],
    "heritage": ["air_conditioning", "breakfast"], "lake": ["waterfront"], "city": ["air_conditioning", "gym"],
    "countryside": ["free_parking", "bbq_grill"],
}

# (slug, name, icon) — order = position in the category bar
CATEGORIES = [
    ("amazing_views", "Amazing views", "mountain-snow"), ("beachfront", "Beachfront", "umbrella"),
    ("amazing_pools", "Amazing pools", "waves"), ("cabins", "Cabins", "tent-tree"),
    ("trending", "Trending", "flame"), ("countryside", "Countryside", "trees"), ("farms", "Farms", "tractor"),
    ("tiny_homes", "Tiny homes", "house"), ("lakefront", "Lakefront", "sailboat"), ("mansions", "Mansions", "castle"),
    ("historical_homes", "Historical homes", "landmark"), ("tropical", "Tropical", "tree-palm"),
    ("top_cities", "Top cities", "building-2"), ("houseboats", "Houseboats", "ship"),
]

# (name, email, is_superhost, avatar, bio, years hosting)
HOSTS = [
    ("Rahul Mehta", DEMO_HOST_EMAIL, True, "https://randomuser.me/api/portraits/men/32.jpg",
     "Architect turned host. I restore old homes across India and love sharing them.", 6),
    ("Priya Nair", "priya@example.com", True, "https://randomuser.me/api/portraits/women/44.jpg",
     "Kochi native who loves the backwaters and strong filter coffee.", 5),
    ("Arjun Singh", "arjun@example.com", False, "https://randomuser.me/api/portraits/men/51.jpg",
     "Mountain guide and weekend baker.", 3),
    ("Meera Iyer", "meera@example.com", False, "https://randomuser.me/api/portraits/women/65.jpg",
     "Heritage conservationist and chai enthusiast.", 4),
    ("Kabir Khan", "kabir@example.com", False, "https://randomuser.me/api/portraits/men/76.jpg",
     "Photographer. Happy to share my favourite local spots.", 2),
    ("Sofia D'Souza", "sofia@example.com", False, "https://randomuser.me/api/portraits/women/12.jpg",
     "Goan at heart. Ask me about the best beach shacks.", 3),
]

# (name, email, avatar)
GUESTS = [
    ("Ananya Sharma", DEMO_GUEST_EMAIL, "https://randomuser.me/api/portraits/women/68.jpg"),
    ("Vikram Rao", "vikram@example.com", "https://randomuser.me/api/portraits/men/41.jpg"),
    ("Neha Gupta", "neha@example.com", "https://randomuser.me/api/portraits/women/22.jpg"),
    ("Rohan Das", "rohan@example.com", "https://randomuser.me/api/portraits/men/15.jpg"),
    ("Isha Kapoor", "isha@example.com", "https://randomuser.me/api/portraits/women/33.jpg"),
    ("Aditya Verma", "aditya@example.com", "https://randomuser.me/api/portraits/men/85.jpg"),
    ("Zoya Ali", "zoya@example.com", "https://randomuser.me/api/portraits/women/90.jpg"),
    ("Karan Malhotra", "karan@example.com", "https://randomuser.me/api/portraits/men/64.jpg"),
]

DESTINATION_THEMES = {
    "Goa": "beach", "Manali": "mountain", "Jaipur": "heritage", "Udaipur": "lake", "Mumbai": "city",
    "Bengaluru": "city", "Alleppey": "lake", "Munnar": "countryside", "Rishikesh": "mountain",
    "Coorg": "countryside", "Puducherry": "beach", "Shimla": "mountain",
}


@dataclass(frozen=True)
class Blueprint:
    destination: str
    city: str
    title: str
    property_type: str
    room_type: str
    nightly_price: int
    cleaning_fee: int
    max_guests: int
    bedrooms: int
    beds: int
    bathrooms: int
    categories: tuple[str, ...]


B = Blueprint
LISTINGS = [
    B("Goa", "Assagao", "Sunlit Portuguese villa with private pool", "villa", "entire_home", 14500, 2500, 8, 4, 5, 4, ("amazing_pools", "tropical", "mansions")),
    B("Goa", "Palolem", "Palolem beach hut steps from the sand", "cabin", "entire_home", 3200, 500, 2, 1, 1, 1, ("beachfront", "tropical")),
    B("Goa", "Candolim", "Candolim sea-view flat with balcony", "flat", "entire_home", 4800, 800, 4, 2, 2, 2, ("amazing_views", "beachfront")),
    B("Goa", "Anjuna", "Anjuna tiny home under the cashew trees", "tiny_home", "entire_home", 2600, 400, 2, 1, 1, 1, ("tiny_homes", "trending")),
    B("Manali", "Old Manali", "Cedar-wood cabin with snow-peak views", "cabin", "entire_home", 5200, 900, 4, 2, 2, 1, ("cabins", "amazing_views")),
    B("Manali", "Vashisht", "Apple-orchard cottage in Vashisht", "cottage", "entire_home", 3900, 600, 5, 2, 3, 2, ("farms", "countryside")),
    B("Manali", "Manali", "Cosy room in a Himachali homestay", "guest_house", "private_room", 1600, 200, 2, 1, 1, 1, ("countryside",)),
    B("Manali", "Solang", "Solang valley chalet with fireplace", "house", "entire_home", 8800, 1500, 6, 3, 4, 3, ("cabins", "trending")),
    B("Jaipur", "Jaipur", "Royal haveli suite near Hawa Mahal", "guest_house", "private_room", 4200, 500, 2, 1, 1, 1, ("historical_homes", "top_cities")),
    B("Jaipur", "Jaipur", "Pink City courtyard home with rooftop", "house", "entire_home", 7600, 1200, 6, 3, 3, 3, ("historical_homes", "trending")),
    B("Jaipur", "Jaipur", "Boutique heritage hotel room near Amer Fort", "hotel", "private_room", 5400, 0, 2, 1, 1, 1, ("historical_homes",)),
    B("Jaipur", "Jaipur", "Modern flat in C-Scheme", "flat", "entire_home", 3100, 500, 3, 1, 2, 1, ("top_cities",)),
    B("Udaipur", "Udaipur", "Lake Pichola view heritage room", "hotel", "private_room", 6200, 0, 2, 1, 1, 1, ("lakefront", "historical_homes")),
    B("Udaipur", "Udaipur", "Palace-style villa with lake terrace", "villa", "entire_home", 18500, 3000, 10, 5, 6, 5, ("mansions", "lakefront", "amazing_pools")),
    B("Udaipur", "Udaipur", "Old City artist's flat", "flat", "entire_home", 2900, 400, 3, 1, 2, 1, ("trending",)),
    B("Udaipur", "Udaipur", "Aravalli hills farm stay", "farm_stay", "entire_home", 4600, 700, 6, 3, 3, 2, ("farms", "countryside")),
    B("Mumbai", "Mumbai", "Sea-facing flat on Marine Drive", "flat", "entire_home", 9800, 1500, 4, 2, 2, 2, ("amazing_views", "top_cities")),
    B("Mumbai", "Mumbai", "Bandra loft near Carter Road", "flat", "entire_home", 6900, 1000, 3, 1, 2, 1, ("top_cities", "trending")),
    B("Mumbai", "Mumbai", "Colaba heritage guest room", "guest_house", "private_room", 3400, 300, 2, 1, 1, 1, ("historical_homes", "top_cities")),
    B("Mumbai", "Mumbai", "Juhu beach bungalow with garden", "house", "entire_home", 15500, 2500, 8, 4, 4, 4, ("beachfront", "mansions")),
    B("Bengaluru", "Bengaluru", "Indiranagar studio with workspace", "flat", "entire_home", 2800, 400, 2, 1, 1, 1, ("top_cities",)),
    B("Bengaluru", "Bengaluru", "Garden cottage in Whitefield", "cottage", "entire_home", 3600, 600, 4, 2, 2, 2, ("countryside",)),
    B("Bengaluru", "Bengaluru", "Koramangala room in a designer home", "house", "private_room", 1900, 200, 2, 1, 1, 1, ("trending", "top_cities")),
    B("Bengaluru", "Bengaluru", "Nandi Hills view farmhouse", "farm_stay", "entire_home", 7200, 1200, 8, 4, 5, 3, ("farms", "amazing_views")),
    B("Alleppey", "Alleppey", "Private houseboat on Vembanad Lake", "houseboat", "entire_home", 9500, 1000, 4, 2, 2, 2, ("houseboats", "lakefront")),
    B("Alleppey", "Alleppey", "Backwater-front villa with canoe", "villa", "entire_home", 8400, 1200, 6, 3, 3, 3, ("lakefront", "tropical")),
    B("Alleppey", "Alleppey", "Paddy-field homestay room", "guest_house", "private_room", 1800, 200, 2, 1, 1, 1, ("countryside", "tropical")),
    B("Alleppey", "Alleppey", "Coconut-grove cottage by the canal", "cottage", "entire_home", 3300, 500, 3, 1, 2, 1, ("tropical", "lakefront")),
    B("Munnar", "Munnar", "Tea-estate bungalow in the clouds", "house", "entire_home", 11200, 1800, 8, 4, 4, 4, ("amazing_views", "farms")),
    B("Munnar", "Munnar", "Treetop cabin above the tea gardens", "cabin", "entire_home", 4700, 700, 2, 1, 1, 1, ("cabins", "amazing_views")),
    B("Munnar", "Munnar", "Misty valley cottage", "cottage", "entire_home", 3500, 500, 4, 2, 2, 1, ("countryside",)),
    B("Munnar", "Munnar", "Planter's guest room with valley view", "guest_house", "private_room", 2100, 200, 2, 1, 1, 1, ("historical_homes", "countryside")),
    B("Rishikesh", "Rishikesh", "Riverside cottage near Laxman Jhula", "cottage", "entire_home", 3800, 500, 4, 2, 2, 1, ("lakefront", "trending")),
    B("Rishikesh", "Rishikesh", "Yoga retreat room with Ganges view", "guest_house", "private_room", 1700, 0, 2, 1, 1, 1, ("amazing_views",)),
    B("Rishikesh", "Rishikesh", "Forest cabin in Tapovan", "cabin", "entire_home", 2900, 400, 3, 1, 2, 1, ("cabins", "countryside")),
    B("Rishikesh", "Rishikesh", "Boutique hotel suite in Tapovan", "hotel", "private_room", 4400, 0, 2, 1, 1, 1, ("trending",)),
    B("Coorg", "Coorg", "Coffee-plantation estate villa", "villa", "entire_home", 13500, 2000, 10, 5, 6, 5, ("farms", "mansions", "amazing_pools")),
    B("Coorg", "Coorg", "Waterfall-view cottage near Madikeri", "cottage", "entire_home", 4100, 600, 4, 2, 2, 2, ("amazing_views", "countryside")),
    B("Coorg", "Coorg", "Plantation homestay room", "guest_house", "private_room", 2300, 200, 2, 1, 1, 1, ("farms",)),
    B("Coorg", "Coorg", "A-frame tiny home in the coffee hills", "tiny_home", "entire_home", 3700, 500, 2, 1, 1, 1, ("tiny_homes", "trending")),
    B("Puducherry", "Puducherry", "French Quarter heritage villa", "villa", "entire_home", 9200, 1500, 6, 3, 3, 3, ("historical_homes", "amazing_pools")),
    B("Puducherry", "Puducherry", "Promenade sea-view flat", "flat", "entire_home", 4300, 600, 4, 2, 2, 2, ("beachfront", "amazing_views")),
    B("Puducherry", "Puducherry", "Auroville eco tiny home", "tiny_home", "entire_home", 2400, 300, 2, 1, 1, 1, ("tiny_homes", "countryside")),
    B("Puducherry", "Puducherry", "Tamil Quarter courtyard room", "guest_house", "private_room", 1900, 200, 2, 1, 1, 1, ("historical_homes",)),
    B("Shimla", "Shimla", "Colonial cottage on the Ridge", "cottage", "entire_home", 5600, 800, 4, 2, 2, 2, ("historical_homes", "amazing_views")),
    B("Shimla", "Shimla", "Pine-forest cabin in Mashobra", "cabin", "entire_home", 4900, 700, 4, 2, 3, 1, ("cabins", "countryside")),
    B("Shimla", "Shimla", "Mall Road view flat", "flat", "entire_home", 3200, 500, 3, 1, 2, 1, ("top_cities",)),
    B("Shimla", "Shimla", "Snow-view hotel room in Kufri", "hotel", "private_room", 3900, 0, 2, 1, 1, 1, ("amazing_views",)),
]
DEMO_HOST_LISTING_INDEXES = (0, 4, 8, 12, 16, 24, 28, 40)  # Rahul's 8 listings, one per region

REVIEW_COMMENTS = [
    "{host} was a wonderful host and the place was spotless. {city} was magical.",
    "Exactly as pictured. Great location for exploring {city}.",
    "Beautiful home, very comfortable beds and a super quick check-in.",
    "We loved every minute. {host} gave us great local tips.",
    "Peaceful, clean and thoughtfully designed. Would stay again.",
    "Perfect base for a long weekend in {city}. Highly recommend.",
    "The views are even better in person. Thank you {host}!",
    "Spacious, well equipped and in a quiet neighbourhood.",
    "Good value for money and {host} responded within minutes.",
    "A little tricky to find at night, but the stay itself was lovely.",
    "Cosy and charming, with everything we needed for a relaxed trip.",
    "Our favourite stay of the whole trip to {city}.",
]
```

`backend/app/seed/run.py`:
```python
"""Deterministic demo data (random.Random(42)); every date is relative to `today` so the demo never goes stale."""

import random
from datetime import date, datetime, time, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.destinations import DESTINATIONS
from app.models import Amenity, Booking, Category, Listing, ListingPhoto, Review, User, WishlistItem
from app.seed.data import (
    ALWAYS_AMENITIES, AMENITIES, CATEGORIES, DEMO_GUEST_EMAIL, DEMO_HOST_LISTING_INDEXES, DESTINATION_THEMES,
    GUESTS, HOSTS, LISTINGS, OPTIONAL_AMENITIES, REVIEW_COMMENTS, THEME_AMENITIES, Blueprint,
)
from app.seed.photos import EXTERIOR, INTERIOR
from app.services.pricing import quote
from app.services.reviews import recompute_listing_rating

TYPE_LABELS = {"guest_house": "guest house", "tiny_home": "tiny home", "farm_stay": "farm stay"}


def seed_if_empty(db: Session, today: date) -> bool:
    if db.scalar(select(func.count(User.id))):
        return False
    seed(db, today)
    return True


def seed(db: Session, today: date) -> None:
    rng = random.Random(42)
    amenities = {code: Amenity(code=code, name=name, icon=icon, group_name=group) for code, name, icon, group in AMENITIES}
    categories = {slug: Category(slug=slug, name=name, icon=icon, position=i)
                  for i, (slug, name, icon) in enumerate(CATEGORIES)}
    hosts = [User(name=n, email=e, is_superhost=s, avatar_url=a, bio=b,
                  created_at=datetime.combine(today - timedelta(days=365 * years), time(9)))
             for n, e, s, a, b, years in HOSTS]
    guests = [User(name=n, email=e, avatar_url=a, created_at=datetime.combine(today - timedelta(days=700), time(9)))
              for n, e, a in GUESTS]
    db.add_all([*amenities.values(), *categories.values(), *hosts, *guests])

    listings = [_make_listing(rng, i, bp, hosts, amenities, categories, today) for i, bp in enumerate(LISTINGS)]
    db.add_all(listings)
    db.flush()

    demo_guest = next(g for g in guests if g.email == DEMO_GUEST_EMAIL)
    taken: dict[int, list[tuple[date, date]]] = {listing.id: [] for listing in listings}
    _demo_guest_trips(db, rng, demo_guest, listings, taken, today)
    other_guests = [g for g in guests if g is not demo_guest]
    for listing in listings:
        _history(db, rng, listing, other_guests, taken, today)
    db.flush()

    for listing in listings:
        recompute_listing_rating(db, listing.id)
    db.add_all(WishlistItem(user_id=demo_guest.id, listing_id=listings[i].id) for i in (3, 13, 36))
    db.commit()


def _make_listing(rng, index, bp: Blueprint, hosts, amenities, categories, today) -> Listing:
    destination = next(d for d in DESTINATIONS if d.name == bp.destination)
    theme = DESTINATION_THEMES[bp.destination]
    host = hosts[0] if index in DEMO_HOST_LISTING_INDEXES else hosts[1 + index % (len(hosts) - 1)]
    codes = set(ALWAYS_AMENITIES) | set(THEME_AMENITIES[theme]) | set(rng.sample(OPTIONAL_AMENITIES, rng.randint(2, 5)))
    if "amazing_pools" in bp.categories:
        codes.add("pool")
    photos = [rng.choice(EXTERIOR[theme]), rng.choice(INTERIOR["living"]), *rng.sample(INTERIOR["bedroom"], 2),
              rng.choice(INTERIOR["bathroom"])]
    listing = Listing(
        host=host, title=bp.title, description=_describe(bp, destination.blurb),
        property_type=bp.property_type, room_type=bp.room_type, max_guests=bp.max_guests, bedrooms=bp.bedrooms,
        beds=bp.beds, bathrooms=bp.bathrooms, nightly_price=bp.nightly_price, cleaning_fee=bp.cleaning_fee,
        address=f"{rng.randint(1, 240)} {rng.choice(['Main Road', 'Temple Street', 'Hill View Lane', 'Lake Road', 'Market Street'])}",
        city=bp.city, state=destination.state, country=destination.country,
        latitude=round(destination.latitude + rng.uniform(-0.06, 0.06), 5),
        longitude=round(destination.longitude + rng.uniform(-0.06, 0.06), 5),
        created_at=datetime.combine(today - timedelta(days=rng.randint(120, 900)), time(10)),
    )
    listing.amenities = [amenities[c] for c in sorted(codes)]
    listing.categories = [categories[s] for s in bp.categories]
    listing.photos = [ListingPhoto(url=url, position=i) for i, url in enumerate(photos)]
    return listing


def _describe(bp: Blueprint, blurb: str) -> str:
    kind = TYPE_LABELS.get(bp.property_type, bp.property_type)
    rooms = f"{bp.bedrooms} bedroom{'s' * (bp.bedrooms != 1)}, {bp.beds} bed{'s' * (bp.beds != 1)} and {bp.bathrooms} bathroom{'s' * (bp.bathrooms != 1)}"
    return (
        f"{bp.title} — a {kind} in {bp.city} for up to {bp.max_guests} guests. {blurb} are close by.\n\n"
        f"The space\nYou'll have {rooms}, fresh linen, fast wifi and a calm corner for your morning coffee.\n\n"
        f"Guest access\n{'The whole place is yours' if bp.room_type == 'entire_home' else 'Your private room plus shared common areas'}.\n\n"
        f"Other things to note\nCheck-in after 2 pm, check-out by 11 am. No parties or events."
    )


def _free(taken: list[tuple[date, date]], check_in: date, check_out: date) -> bool:
    return all(check_out <= a or b <= check_in for a, b in taken)


def _book(db, rng, listing, guest, check_in, check_out, taken, status="confirmed") -> Booking:
    adults = rng.randint(1, min(4, listing.max_guests))
    children = rng.randint(0, listing.max_guests - adults) if rng.random() < 0.3 else 0
    price = quote(listing.nightly_price, listing.cleaning_fee, check_in, check_out)
    booking = Booking(
        listing_id=listing.id, guest_id=guest.id, check_in=check_in, check_out=check_out, adults=adults,
        children=children, infants=0, status=status, nightly_price=price.nightly_price, nights=price.nights,
        cleaning_fee=price.cleaning_fee, service_fee=price.service_fee, taxes=price.taxes, total=price.total,
        created_at=datetime.combine(check_in - timedelta(days=rng.randint(10, 60)), time(12)),
    )
    db.add(booking)
    if status == "confirmed":
        taken[listing.id].append((check_in, check_out))
    return booking


def _review(db, rng, booking, listing) -> None:
    overall = rng.choice([5, 5, 5, 5, 5, 4, 4, 4, 3])
    sub = lambda: max(1, min(5, overall + rng.choice([-1, 0, 0, 0, 1])))  # noqa: E731
    db.add(Review(
        booking=booking, rating=overall, cleanliness_rating=sub(), accuracy_rating=sub(), check_in_rating=sub(),
        communication_rating=sub(), location_rating=sub(), value_rating=sub(),
        comment=rng.choice(REVIEW_COMMENTS).format(host=listing.host.name.split()[0], city=listing.city),
        created_at=datetime.combine(booking.check_out + timedelta(days=2), time(10)),
    ))


def _demo_guest_trips(db, rng, guest, listings, taken, today) -> None:
    d = lambda n: today + timedelta(days=n)  # noqa: E731
    _book(db, rng, listings[1], guest, d(10), d(14), taken)                       # upcoming: Palolem beach hut
    _book(db, rng, listings[5], guest, d(40), d(44), taken)                       # upcoming: Vashisht cottage
    reviewed = _book(db, rng, listings[2], guest, d(-60), d(-56), taken)          # past, reviewed
    _review(db, rng, reviewed, listings[2])
    _book(db, rng, listings[9], guest, d(-12), d(-9), taken)                      # past, awaiting review
    _book(db, rng, listings[6], guest, d(20), d(23), taken, status="cancelled")   # cancelled


def _history(db, rng, listing, guests, taken, today) -> None:
    cursor = today - timedelta(days=330)
    for _ in range(rng.randint(3, 5)):  # completed stays
        check_in = cursor + timedelta(days=rng.randint(5, 40))
        check_out = check_in + timedelta(days=rng.randint(2, 5))
        if check_out >= today:
            break
        cursor = check_out
        if _free(taken[listing.id], check_in, check_out):
            booking = _book(db, rng, listing, rng.choice(guests), check_in, check_out, taken)
            if rng.random() < 0.85:
                _review(db, rng, booking, listing)
    cursor = today + timedelta(days=rng.randint(1, 7))
    for _ in range(rng.randint(1, 3)):  # upcoming stays
        check_in, check_out = cursor, cursor + timedelta(days=rng.randint(2, 5))
        if _free(taken[listing.id], check_in, check_out):
            _book(db, rng, listing, rng.choice(guests), check_in, check_out, taken)
        cursor = check_out + timedelta(days=rng.randint(3, 20))
```

`backend/app/seed/__main__.py`:
```python
"""python -m app.seed [--reset] — create tables and load demo data into DATABASE_URL."""

import argparse

from sqlalchemy.orm import Session

from app import models  # noqa: F401
from app.core.clock import today_ist
from app.core.config import get_settings
from app.core.db import Base, make_engine
from app.seed.run import seed_if_empty


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed the demo database")
    parser.add_argument("--reset", action="store_true", help="drop every table first")
    args = parser.parse_args()
    engine = make_engine(get_settings().database_url)
    if args.reset:
        Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        created = seed_if_empty(db, today_ist())
    print("Seeded demo data" if created else "Database already has data (use --reset to reseed)")


if __name__ == "__main__":
    main()
```

In `backend/app/core/config.py`, change the default to `seed_on_startup: bool = True` and delete the comment after it. (Tests already pass `seed_on_startup=False`.)

- [ ] **Step 5: Run the tests to verify they pass**

Run: `.venv/Scripts/python -m pytest`
Expected: all pass. If `test_seed_builds_a_usable_demo_world` fails on `host_upcoming >= 3` or the review count, adjust the ranges in `_history`, never the assertions. The demo depends on them.

- [ ] **Step 6: Commit**

```bash
git add backend
git commit -m "feat(backend): add deterministic demo seed with curated photos"
```

---

### Task 14: Phase 0–1 verification

**Files:** none new. This is a gate.

- [ ] **Step 1: Run the full suite**

Run: `.venv/Scripts/python -m pytest`
Expected: every test passes, with no warnings about unclosed sessions.

- [ ] **Step 2: Boot the real server against a fresh database**

```bash
rm -rf data
.venv/Scripts/python -m uvicorn app.main:create_app --factory --port 8000
```
Expected: the server starts, and `data/app.db` is created and seeded.

- [ ] **Step 3: Smoke-test the live API** (in a second terminal)

```bash
curl -s localhost:8000/api/health
curl -s "localhost:8000/api/listings?location=Goa&page_size=2"
curl -s -c jar.txt -X POST localhost:8000/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"ananya@example.com\"}"
curl -s -b jar.txt localhost:8000/api/bookings/mine
```
Expected: `{"status":"ok"}`; 2 Goa cards with photos and ratings; Ananya's user; 5 trips (2 upcoming, 2 past, 1 cancelled).

- [ ] **Step 4: Check the API docs**

Open `http://localhost:8000/docs`. Every endpoint in spec §6 is listed.

- [ ] **Step 5: Commit and tag**

```bash
rm -f jar.txt
git tag phase-1-backend
```

Phase 0–1 is done. Next, write the Phase 2 plan (frontend foundation) against this API.
