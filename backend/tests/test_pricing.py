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
