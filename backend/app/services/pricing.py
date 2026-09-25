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
