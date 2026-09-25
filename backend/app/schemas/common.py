from datetime import datetime, timezone
from typing import Annotated, Generic, TypeVar

from pydantic import AfterValidator, BaseModel

T = TypeVar("T")


def _as_utc(value: datetime) -> datetime:
    # SQLite returns naive datetimes; every stored timestamp is UTC, so say so on the way out.
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)


UtcDateTime = Annotated[datetime, AfterValidator(_as_utc)]


class Page(BaseModel, Generic[T]):
    items: list[T]
    page: int
    page_size: int
    total: int
    has_more: bool
