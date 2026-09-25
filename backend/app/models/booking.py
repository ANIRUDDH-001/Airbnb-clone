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
