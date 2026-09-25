"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { RangeCalendar, type Stay } from "@/components/calendar/RangeCalendar";
import { GuestSteppers } from "@/components/search/GuestSteppers";
import { Modal } from "@/components/ui/Modal";
import type { DateRange, Guests, ISODate } from "@/lib/api/types";
import { bookedNights } from "@/lib/dates";
import { formatRange, guestsLabel } from "@/lib/format";
import { stayQuery } from "@/lib/search";

interface TripEditorProps {
  listingId: number;
  checkIn: ISODate;
  checkOut: ISODate;
  guests: Guests;
  maxGuests: number;
  bookedRanges: DateRange[];
  today: ISODate;
}

/** "Your trip" on the confirm page: dates and guests, each editable in a modal. Saving re-prices on the server. */
export function TripEditor({ listingId, checkIn, checkOut, guests, maxGuests, bookedRanges, today }: TripEditorProps) {
  const router = useRouter();
  const booked = useMemo(() => bookedNights(bookedRanges), [bookedRanges]);
  const [editing, setEditing] = useState<"dates" | "guests" | null>(null);
  const [dates, setDates] = useState<Stay>({ checkIn, checkOut });
  const [party, setParty] = useState(guests);

  function save(next: Stay & Guests) {
    setEditing(null);
    router.replace(`/book/${listingId}${stayQuery(next)}`, { scroll: false });
  }

  return (
    <section className="border-b border-line pb-8">
      <h2 className="mb-6 text-[22px] font-semibold">Your trip</h2>
      <Row title="Dates" value={formatRange(checkIn, checkOut)} onEdit={() => { setDates({ checkIn, checkOut }); setEditing("dates"); }} />
      <Row title="Guests" value={guestsLabel(guests)} onEdit={() => { setParty(guests); setEditing("guests"); }} />

      <Modal
        open={editing === "dates"}
        onClose={() => setEditing(null)}
        title="Change dates"
        size="lg"
        footer={
          <div className="flex items-center justify-between">
            <button type="button" className="font-semibold underline" onClick={() => setDates({})}>Clear dates</button>
            <button type="button" disabled={!dates.checkIn || !dates.checkOut}
                    onClick={() => save({ ...dates, ...guests })}
                    className="rounded-lg bg-ink px-6 py-3 font-semibold text-white disabled:opacity-40">
              Save
            </button>
          </div>
        }
      >
        {/* Your own current dates are still "free" for you: they aren't booked until you confirm. */}
        <RangeCalendar checkIn={dates.checkIn} checkOut={dates.checkOut} onChange={setDates} booked={booked} today={today} />
      </Modal>

      <Modal
        open={editing === "guests"}
        onClose={() => setEditing(null)}
        title="Guests"
        size="sm"
        footer={
          <div className="text-right">
            <button type="button" onClick={() => save({ checkIn, checkOut, ...party })}
                    className="rounded-lg bg-ink px-6 py-3 font-semibold text-white">
              Save
            </button>
          </div>
        }
      >
        <GuestSteppers value={party} onChange={setParty} maxGuests={maxGuests} minAdults={1} />
      </Modal>
    </section>
  );
}

function Row({ title, value, onEdit }: { title: string; value: string; onEdit: () => void }) {
  return (
    <div className="mb-6 flex items-start justify-between last:mb-0">
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p>{value}</p>
      </div>
      <button type="button" onClick={onEdit} className="rounded-lg px-2 py-1 font-semibold underline hover:bg-soft">Edit</button>
    </div>
  );
}
