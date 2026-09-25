"use client";

import { formatRange, formatINR, plural } from "@/lib/format";

import { ReserveButton } from "./ReserveCard";
import { useStay } from "./StayProvider";

/** Phones: price and Reserve pinned to the bottom (replaces the tab bar on listing pages). */
export function MobileReserveBar() {
  const stay = useStay();
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-4 border-t border-line bg-white px-6 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:hidden">
      <div className="min-w-0">
        {stay.quote ? (
          <p><span className="font-semibold underline">{formatINR(stay.quote.total)}</span> for {plural(stay.quote.nights, "night")}</p>
        ) : (
          <p><span className="font-semibold">{formatINR(stay.listing.nightlyPrice)}</span> night</p>
        )}
        <p className="truncate text-xs font-semibold underline">
          {stay.checkIn && stay.checkOut ? formatRange(stay.checkIn, stay.checkOut) : "Add dates"}
        </p>
      </div>
      <ReserveButton compact onNeedDates={() => document.getElementById("availability")?.scrollIntoView({ behavior: "smooth" })} />
    </div>
  );
}
