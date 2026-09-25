import { format, isSameMonth, isSameYear, parseISO } from "date-fns";

import type { Guests, PropertyType, RoomType } from "./api/types";

/** ₹14,500 — integer rupees with Indian digit grouping. */
export function formatINR(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** 5 → "5.0", 4.8 → "4.8", 4.75 → "4.75" (as the live site shows ratings). */
export function formatRating(rating: number): string {
  const fixed = rating.toFixed(2);
  return fixed.endsWith("0") ? rating.toFixed(1) : fixed;
}

export const PROPERTY_LABELS: Record<PropertyType, string> = {
  house: "House", flat: "Flat", guest_house: "Guest house", hotel: "Hotel", villa: "Villa", cabin: "Cabin",
  cottage: "Cottage", tiny_home: "Tiny home", farm_stay: "Farm stay", houseboat: "Houseboat",
};

export const ROOM_LABELS: Record<RoomType, string> = {
  entire_home: "Entire home", private_room: "Private room", shared_room: "Shared room",
};

/** "Villa in Assagao" / "Room in Jaipur" — the card heading on the live site. */
export function cardHeading(propertyType: PropertyType, roomType: RoomType, city: string): string {
  const kind = roomType === "entire_home" ? PROPERTY_LABELS[propertyType] : "Room";
  return `${kind} in ${city}`;
}

/** Dates on the wire are "YYYY-MM-DD"; parseISO keeps them as local calendar dates (no UTC shift). */
export const fromISODate = (value: string) => parseISO(value);
export const toISODate = (date: Date) => format(date, "yyyy-MM-dd");

/** "12–15 Oct", "30 Oct – 2 Nov", "28 Dec 2026 – 2 Jan 2027". */
export function formatRange(checkIn: string, checkOut: string): string {
  const start = fromISODate(checkIn);
  const end = fromISODate(checkOut);
  if (!isSameYear(start, end)) return `${format(start, "d MMM yyyy")} – ${format(end, "d MMM yyyy")}`;
  if (isSameMonth(start, end)) return `${format(start, "d")}–${format(end, "d MMM")}`;
  return `${format(start, "d MMM")} – ${format(end, "d MMM")}`;
}

export function formatLongDate(value: string): string {
  return format(fromISODate(value), "EEE, d MMM yyyy");
}

/** "3 guests, 1 infant" — children count as guests, infants are listed separately. */
export function guestsLabel({ adults, children, infants }: Guests): string {
  const parts = [plural(adults + children, "guest")];
  if (infants) parts.push(plural(infants, "infant"));
  return parts.join(", ");
}

export function firstName(name: string): string {
  return name.split(" ")[0];
}

/** Sized Unsplash URL (their CDN resizes on the fly); other hosts' URLs are returned unchanged. */
export function sizedPhoto(url: string, width: number): string {
  if (!url.startsWith("https://images.unsplash.com/")) return url;
  const parsed = new URL(url);
  parsed.searchParams.set("w", String(width));
  return parsed.toString();
}
