"use client";

import clsx from "clsx";
import { format, parseISO, startOfMonth } from "date-fns";
import { useState } from "react";
import { DayPicker } from "react-day-picker";

import type { ISODate } from "@/lib/api/types";
import { isCheckInDisabled, isCheckOutDisabled } from "@/lib/dates";

export interface Stay {
  checkIn?: ISODate;
  checkOut?: ISODate;
}

interface RangeCalendarProps extends Stay {
  onChange: (stay: Stay) => void;
  today: ISODate;
  /** Booked nights of one listing (detail page). Empty for the search bar. */
  booked?: Set<ISODate>;
  months?: 1 | 2;
}

const EMPTY = new Set<ISODate>();
const iso = (date: Date): ISODate => format(date, "yyyy-MM-dd");

/**
 * Airbnb-style two-month range picker. Clicks are handled here (not by DayPicker's range mode) because the rules
 * differ by step: a booked day can never be a check-in, but it can be the check-out of a stay that ends there.
 */
export function RangeCalendar({ checkIn, checkOut, onChange, today, booked = EMPTY, months = 2 }: RangeCalendarProps) {
  const [hovered, setHovered] = useState<ISODate | null>(null);
  const pickingCheckOut = Boolean(checkIn && !checkOut);

  function isDisabled(date: Date): boolean {
    const day = iso(date);
    if (pickingCheckOut && day > checkIn!) return isCheckOutDisabled(day, checkIn!, booked);
    return isCheckInDisabled(day, booked, today);
  }

  function select(date: Date) {
    const day = iso(date);
    if (pickingCheckOut && day > checkIn! && !isCheckOutDisabled(day, checkIn!, booked)) {
      onChange({ checkIn, checkOut: day });
    } else if (!isCheckInDisabled(day, booked, today)) {
      onChange({ checkIn: day, checkOut: undefined });
    }
  }

  // While choosing a check-out, preview the range up to the hovered day (if that day is a valid check-out).
  const previewEnd =
    pickingCheckOut && hovered && hovered > checkIn! && !isCheckOutDisabled(hovered, checkIn!, booked) ? hovered : null;
  const end = checkOut ?? previewEnd;

  return (
    <DayPicker
      numberOfMonths={months}
      pagedNavigation
      showOutsideDays={false}
      weekStartsOn={0}
      startMonth={startOfMonth(parseISO(today))}
      defaultMonth={checkIn ? parseISO(checkIn) : parseISO(today)}
      disabled={isDisabled}
      onDayClick={(date, modifiers) => !modifiers.disabled && select(date)}
      onDayMouseEnter={(date) => setHovered(iso(date))}
      onDayMouseLeave={() => setHovered(null)}
      modifiers={{
        start: (date) => iso(date) === checkIn,
        end: (date) => Boolean(end) && iso(date) === end,
        middle: (date) => Boolean(checkIn && end) && iso(date) > checkIn! && iso(date) < end!,
        // The grey band runs from the start circle to the end circle, so the ends need to know it exists.
        banded: () => Boolean(checkIn && end && end !== checkIn),
        preview: () => Boolean(previewEnd),
      }}
      modifiersClassNames={{
        start: "rdp-start",
        end: "rdp-end",
        middle: "rdp-middle",
        banded: "rdp-banded",
        preview: "rdp-preview",
      }}
      classNames={{
        root: "rdp-airbnb relative",
        months: clsx("flex flex-col gap-8", months === 2 && "md:flex-row md:gap-12"),
        month: "flex-1",
        month_caption: "mb-4 flex h-9 items-center justify-center text-base font-semibold",
        nav: "absolute inset-x-0 top-0 flex h-9 items-center justify-between",
        button_previous: "grid size-8 place-items-center rounded-full hover:bg-soft disabled:opacity-20 disabled:hover:bg-transparent",
        button_next: "grid size-8 place-items-center rounded-full hover:bg-soft disabled:opacity-20 disabled:hover:bg-transparent",
        chevron: "size-4 fill-ink",
        month_grid: "w-full border-collapse",
        weekdays: "text-xs font-semibold text-muted",
        weekday: "h-8 font-semibold",
        day: "rdp-cell p-0 text-center",
        day_button: "rdp-day mx-auto grid size-11 place-items-center rounded-full text-sm font-semibold",
        disabled: "rdp-disabled",
        today: "rdp-today",
      }}
    />
  );
}
