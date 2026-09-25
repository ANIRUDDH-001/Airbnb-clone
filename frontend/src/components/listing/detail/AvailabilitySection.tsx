"use client";

import { format, parseISO } from "date-fns";

import { RangeCalendar } from "@/components/calendar/RangeCalendar";
import { nightsBetween } from "@/lib/dates";
import { plural } from "@/lib/format";

import { useStay } from "./StayProvider";

export function AvailabilitySection() {
  const stay = useStay();
  const nights = stay.checkIn && stay.checkOut ? nightsBetween(stay.checkIn, stay.checkOut) : 0;

  return (
    <section id="availability" className="scroll-mt-32 border-b border-line py-12">
      <h2 className="text-[22px] font-semibold">
        {nights ? `${plural(nights, "night")} in ${stay.listing.city}` : stay.checkIn ? "Select checkout date" : "Select check-in date"}
      </h2>
      <p className="mt-1 text-sm text-muted">
        {nights
          ? `${format(parseISO(stay.checkIn!), "d MMM yyyy")} – ${format(parseISO(stay.checkOut!), "d MMM yyyy")}`
          : stay.checkIn
            ? "Minimum stay: 1 night"
            : "Add your travel dates for exact pricing"}
      </p>
      <div className="mt-6">
        <RangeCalendar
          checkIn={stay.checkIn}
          checkOut={stay.checkOut}
          booked={stay.booked}
          today={stay.today}
          onChange={stay.setDates}
        />
      </div>
      <div className="mt-2 text-right">
        <button type="button" onClick={() => stay.setDates({})} disabled={!stay.checkIn}
                className="rounded-lg px-2 py-2 text-sm font-semibold underline disabled:opacity-30">
          Clear dates
        </button>
      </div>
    </section>
  );
}
