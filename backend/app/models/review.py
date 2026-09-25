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
