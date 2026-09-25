"use client";

import clsx from "clsx";
import { format, parseISO } from "date-fns";
import { ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { RangeCalendar } from "@/components/calendar/RangeCalendar";
import { GuestSteppers } from "@/components/search/GuestSteppers";
import { nightsBetween } from "@/lib/dates";
import { formatINR, guestsLabel, plural } from "@/lib/format";

import { useStay } from "./StayProvider";

type Popover = "dates" | "guests" | null;

const fieldDate = (value?: string) => (value ? format(parseISO(value), "d/M/yyyy") : "Add date");

export function ReserveCard() {
  const stay = useStay();
  const [popover, setPopover] = useState<Popover>(null);
  const [seenRequest, setSeenRequest] = useState(stay.datePickerRequest);
  const root = useRef<HTMLDivElement>(null);

  // "Check availability" elsewhere on the page asks for the date picker.
  if (stay.datePickerRequest !== seenRequest) {
    setSeenRequest(stay.datePickerRequest);
    setPopover("dates");
  }

  useEffect(() => {
    if (!popover) return;
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setPopover(null);
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setPopover(null);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [popover]);

  return (
    <div ref={root} className="relative rounded-xl border border-line p-6 shadow-card">
      <PriceHeader />

      <div className="mt-6 rounded-lg border border-[#b0b0b0]">
        <div className="grid grid-cols-2">
          <DateField label="Check-in" value={fieldDate(stay.checkIn)} active={popover === "dates"} onClick={() => setPopover("dates")} />
          <DateField label="Checkout" value={fieldDate(stay.checkOut)} active={popover === "dates"} onClick={() => setPopover("dates")} border />
        </div>
        <button
          type="button"
          onClick={() => setPopover(popover === "guests" ? null : "guests")}
          aria-expanded={popover === "guests"}
          className={clsx("flex w-full items-center justify-between border-t border-[#b0b0b0] px-3 py-2.5 text-left",
            popover === "guests" && "rounded-b-lg outline outline-2 outline-ink")}
        >
          <span>
            <span className="block text-[10px] font-extrabold uppercase">Guests</span>
            <span className="text-sm">{guestsLabel(stay.guests)}</span>
          </span>
          {popover === "guests" ? <ChevronUp className="size-5" /> : <ChevronDown className="size-5" />}
        </button>
      </div>

      {popover === "guests" && (
        <div className="absolute inset-x-6 z-30 mt-1 rounded-xl bg-white p-5 shadow-float">
          <GuestSteppers value={stay.guests} onChange={stay.setGuests} maxGuests={stay.listing.maxGuests} minAdults={1} />
          <div className="mt-4 text-right">
            <button type="button" onClick={() => setPopover(null)} className="rounded-lg px-3 py-2 font-semibold underline hover:bg-soft">
              Close
            </button>
          </div>
        </div>
      )}

      {popover === "dates" && <DatesPopover onClose={() => setPopover(null)} />}

      <ReserveButton onNeedDates={() => setPopover("dates")} />
      <Breakdown />
    </div>
  );
}

function PriceHeader() {
  const { quote, checkIn, checkOut, listing } = useStay();
  if (quote) {
    return (
      <p className="text-[22px]">
        <span className="font-semibold underline">{formatINR(quote.total)}</span>{" "}
        <span className="text-base">for {plural(quote.nights, "night")}</span>
      </p>
    );
  }
  return (
    <p className="text-[22px]">
      {checkIn && checkOut ? null : <span className="sr-only">Add dates for prices. </span>}
      <span className="font-semibold">{formatINR(listing.nightlyPrice)}</span> <span className="text-base">night</span>
    </p>
  );
}

function DateField({ label, value, active, onClick, border }: { label: string; value: string; active: boolean; onClick: () => void; border?: boolean }) {
  return (
    <button type="button" onClick={onClick}
            className={clsx("px-3 py-2.5 text-left", border && "border-l border-[#b0b0b0]", active && "rounded-lg outline outline-2 outline-ink")}>
      <span className="block text-[10px] font-extrabold uppercase">{label}</span>
      <span className={clsx("text-sm", value === "Add date" && "text-muted")}>{value}</span>
    </button>
  );
}

function DatesPopover({ onClose }: { onClose: () => void }) {
  const stay = useStay();
  const nights = stay.checkIn && stay.checkOut ? nightsBetween(stay.checkIn, stay.checkOut) : 0;
  return (
    <div className="absolute -right-6 top-0 z-30 w-[min(680px,calc(100vw-48px))] rounded-3xl bg-white p-8 shadow-float">
      <div className="mb-6 flex items-start justify-between gap-6">
        <div>
          <h3 className="text-[22px] font-semibold">
            {nights ? plural(nights, "night") : stay.checkIn ? "Select checkout date" : "Select dates"}
          </h3>
          <p className="text-sm text-muted">
            {nights
              ? `${format(parseISO(stay.checkIn!), "d MMM yyyy")} – ${format(parseISO(stay.checkOut!), "d MMM yyyy")}`
              : "Add your travel dates for exact pricing"}
          </p>
        </div>
        <div className="grid shrink-0 grid-cols-2 rounded-lg border border-[#b0b0b0] text-left">
          <span className="px-3 py-2"><span className="block text-[10px] font-extrabold uppercase">Check-in</span><span className="text-sm">{fieldDate(stay.checkIn)}</span></span>
          <span className="border-l border-[#b0b0b0] px-3 py-2"><span className="block text-[10px] font-extrabold uppercase">Checkout</span><span className="text-sm">{fieldDate(stay.checkOut)}</span></span>
        </div>
      </div>
      <RangeCalendar
        checkIn={stay.checkIn}
        checkOut={stay.checkOut}
        booked={stay.booked}
        today={stay.today}
        onChange={(next) => {
          stay.setDates(next);
          if (next.checkOut) onClose();
        }}
      />
      <div className="mt-4 flex items-center justify-end gap-4">
        <button type="button" onClick={() => stay.setDates({})} disabled={!stay.checkIn}
                className="rounded-lg px-2 py-2 text-sm font-semibold underline disabled:opacity-30">
          Clear dates
        </button>
        <button type="button" onClick={onClose} className="rounded-lg bg-ink px-5 py-2.5 text-sm font-semibold text-white">
          Close
        </button>
      </div>
    </div>
  );
}

export function ReserveButton({ onNeedDates, compact = false }: { onNeedDates: () => void; compact?: boolean }) {
  const stay = useStay();
  const { requireUser } = useAuth();
  const router = useRouter();
  const base = clsx("bg-brand-gradient h-12 rounded-lg font-semibold text-white transition disabled:opacity-60", compact ? "px-6" : "mt-4 w-full");

  if (stay.listing.isOwnListing) {
    return (
      <Link href={`/hosting/listings/${stay.listing.id}/edit`}
            className={clsx("grid h-12 place-items-center rounded-lg border border-ink font-semibold hover:bg-soft", compact ? "px-6" : "mt-4 w-full")}>
        Edit your listing
      </Link>
    );
  }
  if (!stay.checkIn || !stay.checkOut) {
    return <button type="button" onClick={onNeedDates} className={base}>Check availability</button>;
  }
  return (
    <>
      <button
        type="button"
        disabled={!stay.bookingHref}
        onClick={() => {
          const href = stay.bookingHref;
          if (href) requireUser(() => router.push(href));
        }}
        className={base}
      >
        {stay.quoteLoading ? "Checking…" : "Reserve"}
      </button>
      {!compact && stay.quoteError && (
        <p role="alert" className="mt-3 text-center text-sm text-brand-dark">{stay.quoteError}</p>
      )}
    </>
  );
}

function Breakdown() {
  const { quote, listing } = useStay();
  if (listing.isOwnListing) return <p className="mt-3 text-center text-sm text-muted">This is your listing.</p>;
  if (!quote) return null;
  return (
    <div className="mt-4">
      <p className="text-center text-sm text-muted">You won&apos;t be charged yet</p>
      <dl className="mt-6 space-y-3 text-[15px]">
        <Line label={`${formatINR(quote.nightly_price)} x ${plural(quote.nights, "night")}`} value={quote.subtotal} />
        {quote.cleaning_fee > 0 && <Line label="Cleaning fee" value={quote.cleaning_fee} />}
        <Line label="Airbnb service fee" value={quote.service_fee} />
        <Line label="Taxes" value={quote.taxes} />
      </dl>
      <div className="mt-6 flex justify-between border-t border-line pt-6 font-semibold">
        <span>Total</span>
        <span>{formatINR(quote.total)}</span>
      </div>
    </div>
  );
}

function Line({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between">
      <dt className="underline decoration-1 underline-offset-2">{label}</dt>
      <dd>{formatINR(value)}</dd>
    </div>
  );
}
