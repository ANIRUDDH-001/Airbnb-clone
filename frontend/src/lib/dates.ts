// Calendar rules for the date-range picker. They mirror the backend (services/stay.py): stays are half-open
// [check_in, check_out), so a stay "uses" the nights check_in … check_out − 1. Everything works on "YYYY-MM-DD"
// strings, which compare correctly as text and never shift with the browser's time zone.

import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";

import type { DateRange, ISODate } from "./api/types";

export const MAX_NIGHTS = 90; // backend MAX_NIGHTS

export const addDaysISO = (day: ISODate, amount: number): ISODate => format(addDays(parseISO(day), amount), "yyyy-MM-dd");

export const nightsBetween = (checkIn: ISODate, checkOut: ISODate): number =>
  differenceInCalendarDays(parseISO(checkOut), parseISO(checkIn));

/** Every booked night, as a set of ISO dates. */
export function bookedNights(ranges: DateRange[]): Set<ISODate> {
  const nights = new Set<ISODate>();
  for (const { check_in, check_out } of ranges) {
    for (let night = check_in; night < check_out; night = addDaysISO(night, 1)) nights.add(night);
  }
  return nights;
}

/** True when no night in [checkIn, checkOut) is booked. */
export function rangeIsFree(checkIn: ISODate, checkOut: ISODate, booked: Set<ISODate>): boolean {
  for (let night = checkIn; night < checkOut; night = addDaysISO(night, 1)) {
    if (booked.has(night)) return false;
  }
  return true;
}

/** A guest can arrive on any future day whose night is free (including another guest's check-out day). */
export function isCheckInDisabled(day: ISODate, booked: Set<ISODate>, today: ISODate): boolean {
  return day < today || booked.has(day);
}

/** Check-out must follow check-in, stay within MAX_NIGHTS, and not span a booked night. */
export function isCheckOutDisabled(day: ISODate, checkIn: ISODate, booked: Set<ISODate>): boolean {
  if (day <= checkIn) return true;
  if (nightsBetween(checkIn, day) > MAX_NIGHTS) return true;
  return !rangeIsFree(checkIn, day, booked);
}

/**
 * A booked day whose previous night is free: nobody can arrive that day, but a stay can end on it
 * (Airbnb labels these "check-out only").
 */
export function isCheckOutOnly(day: ISODate, booked: Set<ISODate>): boolean {
  return booked.has(day) && !booked.has(addDaysISO(day, -1));
}

/** Today's date in India (the backend's "today"), whatever the browser's time zone. */
export function todayIST(): ISODate {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}
