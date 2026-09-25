from datetime import date

from pydantic import BaseModel, Field


class StayIn(BaseModel):
    """Dates and party size for a quote or a booking. Infants don't count towards max_guests."""

    check_in: date
    check_out: date
    adults: int = Field(default=1, ge=1, le=16)
    children: int = Field(default=0, ge=0, le=15)
    infants: int = Field(default=0, ge=0, le=5)
