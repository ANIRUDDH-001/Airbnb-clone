// The host listing form: draft state, per-step validation (mirroring backend ListingWrite), and conversions.

import type { Destination, ListingDetail, ListingWrite, PropertyType, RoomType } from "./api/types";

export type ListingDraft = Omit<ListingWrite, "state" | "latitude" | "longitude"> & {
  state: string;
  latitude: number | null;
  longitude: number | null;
};

export type FieldErrors = Partial<Record<keyof ListingDraft, string>>;

export const STEPS = ["type", "location", "basics", "amenities", "photos", "details", "price", "review"] as const;
export type Step = (typeof STEPS)[number];

/** Which fields each step owns, so server errors can be sent back to the right step. */
export const STEP_FIELDS: Record<Step, (keyof ListingDraft)[]> = {
  type: ["property_type", "room_type"],
  location: ["address", "city", "state", "country", "latitude", "longitude"],
  basics: ["max_guests", "bedrooms", "beds", "bathrooms"],
  amenities: ["amenity_codes"],
  photos: ["photo_urls"],
  details: ["title", "description", "category_slugs"],
  price: ["nightly_price", "cleaning_fee"],
  review: [],
};

export const LIMITS = {
  title: [5, 100], description: [20, 5000], address: [3, 200], city: [1, 80], state: [0, 80], country: [2, 80],
  max_guests: [1, 16], bedrooms: [0, 50], beds: [1, 50], bathrooms: [0, 50],
  nightly_price: [100, 1_000_000], cleaning_fee: [0, 100_000], photos: [1, 20],
} as const;

const PHOTO_URL = /^https?:\/\/\S+$/;

export function emptyDraft(): ListingDraft {
  return {
    title: "", description: "", property_type: "house" as PropertyType, room_type: "entire_home" as RoomType,
    max_guests: 2, bedrooms: 1, beds: 1, bathrooms: 1, nightly_price: 3000, cleaning_fee: 500,
    address: "", city: "", state: "", country: "India", latitude: null, longitude: null,
    photo_urls: [], amenity_codes: ["wifi"], category_slugs: [],
  };
}

export function draftFromListing(listing: ListingDetail): ListingDraft {
  return {
    title: listing.title, description: listing.description, property_type: listing.property_type, room_type: listing.room_type,
    max_guests: listing.max_guests, bedrooms: listing.bedrooms, beds: listing.beds, bathrooms: listing.bathrooms,
    nightly_price: listing.nightly_price, cleaning_fee: listing.cleaning_fee, address: listing.address, city: listing.city,
    state: listing.state ?? "", country: listing.country, latitude: listing.latitude, longitude: listing.longitude,
    photo_urls: listing.photos, amenity_codes: listing.amenities.map((a) => a.code),
    category_slugs: listing.categories.map((c) => c.slug),
  };
}

/** Pick a destination: fills city, state, country and coordinates (hosts can still edit them). */
export function applyDestination(draft: ListingDraft, destination: Destination): ListingDraft {
  return {
    ...draft, city: destination.name, state: destination.state, country: destination.country,
    latitude: destination.latitude, longitude: destination.longitude,
  };
}

function lengthError(label: string, value: string, [min, max]: readonly [number, number]): string | undefined {
  const length = value.trim().length;
  if (length < min) return min <= 1 ? `Add ${label.toLowerCase()}` : `${label} needs at least ${min} characters`;
  if (length > max) return `${label} can be at most ${max} characters`;
}

function rangeError(label: string, value: number, [min, max]: readonly [number, number]): string | undefined {
  if (!Number.isInteger(value)) return `${label} must be a whole number`;
  if (value < min || value > max) return `${label} must be between ${min.toLocaleString("en-IN")} and ${max.toLocaleString("en-IN")}`;
}

export function validate(draft: ListingDraft): FieldErrors {
  const errors: FieldErrors = {
    title: lengthError("Title", draft.title, LIMITS.title),
    description: lengthError("Description", draft.description, LIMITS.description),
    address: lengthError("Street address", draft.address, LIMITS.address),
    city: lengthError("A city", draft.city, LIMITS.city),
    state: lengthError("State", draft.state, LIMITS.state),
    country: lengthError("Country", draft.country, LIMITS.country),
    max_guests: rangeError("Guests", draft.max_guests, LIMITS.max_guests),
    bedrooms: rangeError("Bedrooms", draft.bedrooms, LIMITS.bedrooms),
    beds: rangeError("Beds", draft.beds, LIMITS.beds),
    bathrooms: rangeError("Bathrooms", draft.bathrooms, LIMITS.bathrooms),
    nightly_price: rangeError("Nightly price", draft.nightly_price, LIMITS.nightly_price),
    cleaning_fee: rangeError("Cleaning fee", draft.cleaning_fee, LIMITS.cleaning_fee),
  };
  if (draft.latitude === null || draft.longitude === null) errors.latitude = "Pick a destination or enter coordinates";
  else if (Math.abs(draft.latitude) > 90 || Math.abs(draft.longitude) > 180) errors.latitude = "Those coordinates aren't on the map";
  if (draft.photo_urls.length < LIMITS.photos[0]) errors.photo_urls = "Add at least one photo";
  else if (draft.photo_urls.length > LIMITS.photos[1]) errors.photo_urls = `You can add up to ${LIMITS.photos[1]} photos`;
  else if (draft.photo_urls.some((url) => !PHOTO_URL.test(url.trim()))) errors.photo_urls = "Every photo must be a web address starting with http:// or https://";
  return Object.fromEntries(Object.entries(errors).filter(([, message]) => message)) as FieldErrors;
}

/** Errors for the fields one wizard step owns. */
export function stepErrors(step: Step, draft: ListingDraft): FieldErrors {
  const all = validate(draft);
  return Object.fromEntries(STEP_FIELDS[step].filter((field) => all[field]).map((field) => [field, all[field]])) as FieldErrors;
}

export function toListingWrite(draft: ListingDraft): ListingWrite {
  return {
    ...draft,
    title: draft.title.trim(),
    description: draft.description.trim(),
    address: draft.address.trim(),
    city: draft.city.trim(),
    state: draft.state.trim() || null,
    country: draft.country.trim(),
    latitude: draft.latitude ?? 0,
    longitude: draft.longitude ?? 0,
    photo_urls: draft.photo_urls.map((url) => url.trim()),
  };
}

/** Backend 422 details use dotted paths ("photo_urls.0"): map them onto form fields. */
export function errorsFromServer(details: { field: string; message: string }[] | undefined): FieldErrors {
  const errors: FieldErrors = {};
  for (const { field, message } of details ?? []) {
    const key = field.split(".")[0] as keyof ListingDraft;
    errors[key] ??= message;
  }
  return errors;
}
