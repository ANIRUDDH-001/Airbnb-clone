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
