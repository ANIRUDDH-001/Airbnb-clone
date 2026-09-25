// One place that converts between the search URL, the UI state and the /api/listings query.
// URL shape (as on the live site): /s/Goa--India/homes?check_in=…&check_out=…&adults=2&children=1&infants=0&…

import type { Query } from "./api/core";
import type { Guests, ISODate, PropertyType, RoomType, SortOption } from "./api/types";

export const ANYWHERE = "anywhere";
export const MAX_GUESTS = 16; // adults + children (backend guests ≤ 16)
export const MAX_INFANTS = 5;

export interface Filters {
  minPrice?: number;
  maxPrice?: number;
  roomType?: RoomType;
  propertyTypes: PropertyType[];
  amenities: string[];
  minBedrooms: number;
  minBeds: number;
  minBathrooms: number;
}

export interface SearchState extends Guests {
  location: string; // "" = anywhere
  checkIn?: ISODate;
  checkOut?: ISODate;
  category?: string;
  sort: SortOption;
  page: number;
  filters: Filters;
}

export const EMPTY_FILTERS: Filters = {
  propertyTypes: [], amenities: [], minBedrooms: 0, minBeds: 0, minBathrooms: 0,
};

export const DEFAULT_SEARCH: SearchState = {
  location: "", adults: 0, children: 0, infants: 0, sort: "recommended", page: 1, filters: EMPTY_FILTERS,
};

type RawParams = Record<string, string | string[] | undefined>;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const many = (value: string | string[] | undefined) => (value === undefined ? [] : Array.isArray(value) ? value : [value]);
const int = (value: string | string[] | undefined, min: number, max: number, fallback: number) => {
  const parsed = Number.parseInt(one(value) ?? "", 10);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
};
const optionalInt = (value: string | string[] | undefined) => {
  const parsed = Number.parseInt(one(value) ?? "", 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
};
const date = (value: string | string[] | undefined) => {
  const text = one(value);
  return text && ISO_DATE.test(text) ? text : undefined;
};

/** "Goa, India" ⇄ "Goa--India" (the live site's path format). */
export const locationToSlug = (location: string) =>
  location.trim() ? encodeURIComponent(location.trim().replace(/,\s*/g, "--").replace(/\s+/g, "-")) : ANYWHERE;
export const slugToLocation = (slug: string) => {
  const text = decodeURIComponent(slug);
  return text.toLowerCase() === ANYWHERE ? "" : text.replace(/--/g, ", ").replace(/-/g, " ");
};

export function parseSearch(locationSlug: string, params: RawParams): SearchState {
  const checkIn = date(params.check_in);
  const checkOut = date(params.check_out);
  const bothDates = checkIn && checkOut && checkIn < checkOut;
  const sort = one(params.sort);
  return {
    location: slugToLocation(locationSlug),
    checkIn: bothDates ? checkIn : undefined,
    checkOut: bothDates ? checkOut : undefined,
    adults: int(params.adults, 0, MAX_GUESTS, 0),
    children: int(params.children, 0, MAX_GUESTS - 1, 0),
    infants: int(params.infants, 0, MAX_INFANTS, 0),
    category: one(params.category) || undefined,
    sort: sort === "price_asc" || sort === "price_desc" || sort === "rating" ? sort : "recommended",
    page: int(params.page, 1, 1000, 1),
    filters: {
      minPrice: optionalInt(params.min_price),
      maxPrice: optionalInt(params.max_price),
      roomType: (one(params.room_type) as RoomType | undefined) || undefined,
      propertyTypes: many(params.property_types) as PropertyType[],
      amenities: many(params.amenities),
      minBedrooms: int(params.min_bedrooms, 0, 50, 0),
      minBeds: int(params.min_beds, 0, 50, 0),
      minBathrooms: int(params.min_bathrooms, 0, 50, 0),
    },
  };
}

/** Guests counted against a listing's capacity (infants don't count, as on the backend). */
export const guestCount = (state: Guests) => state.adults + state.children;

/** Query string for the search results URL. Defaults are left out to keep URLs short. */
export function searchQuery(state: SearchState): string {
  const { filters: f } = state;
  const params = new URLSearchParams();
  const set = (key: string, value: string | number | undefined, skip?: string | number) => {
    if (value !== undefined && value !== "" && value !== skip) params.set(key, String(value));
  };
  set("check_in", state.checkIn);
  set("check_out", state.checkOut);
  set("adults", state.adults, 0);
  set("children", state.children, 0);
  set("infants", state.infants, 0);
  set("category", state.category);
  set("min_price", f.minPrice);
  set("max_price", f.maxPrice);
  set("room_type", f.roomType);
  f.propertyTypes.forEach((type) => params.append("property_types", type));
  f.amenities.forEach((code) => params.append("amenities", code));
  set("min_bedrooms", f.minBedrooms, 0);
  set("min_beds", f.minBeds, 0);
  set("min_bathrooms", f.minBathrooms, 0);
  set("sort", state.sort, "recommended");
  set("page", state.page, 1);
  const text = params.toString();
  return text ? `?${text}` : "";
}

export const searchHref = (state: SearchState) => `/s/${locationToSlug(state.location)}/homes${searchQuery(state)}`;

/** The /api/listings query for a search. */
export function apiQuery(state: SearchState, pageSize: number): Query {
  const { filters: f } = state;
  return {
    location: state.location || undefined,
    check_in: state.checkIn,
    check_out: state.checkOut,
    guests: Math.max(1, guestCount(state)),
    category: state.category,
    min_price: f.minPrice,
    max_price: f.maxPrice,
    room_type: f.roomType,
    property_types: f.propertyTypes,
    amenities: f.amenities,
    min_bedrooms: f.minBedrooms || undefined,
    min_beds: f.minBeds || undefined,
    min_bathrooms: f.minBathrooms || undefined,
    sort: state.sort,
    page: state.page,
    page_size: pageSize,
  };
}

/** Dates and guests carried from search results to a listing page (and on to booking). */
export function stayQuery(state: Pick<SearchState, "checkIn" | "checkOut"> & Guests): string {
  const params = new URLSearchParams();
  if (state.checkIn && state.checkOut) {
    params.set("check_in", state.checkIn);
    params.set("check_out", state.checkOut);
  }
  if (state.adults) params.set("adults", String(state.adults));
  if (state.children) params.set("children", String(state.children));
  if (state.infants) params.set("infants", String(state.infants));
  const text = params.toString();
  return text ? `?${text}` : "";
}

/** How many filters are set (the badge on the Filters button). */
export function activeFilterCount(f: Filters): number {
  return (
    (f.minPrice !== undefined || f.maxPrice !== undefined ? 1 : 0) +
    (f.roomType ? 1 : 0) +
    f.propertyTypes.length +
    f.amenities.length +
    (f.minBedrooms ? 1 : 0) +
    (f.minBeds ? 1 : 0) +
    (f.minBathrooms ? 1 : 0)
  );
}
