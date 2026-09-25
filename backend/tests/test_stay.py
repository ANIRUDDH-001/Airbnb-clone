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
        (D(2026, 1, 12), D(2026, 4, 13), "invalid_dates"),  # 91 nights > 90
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
