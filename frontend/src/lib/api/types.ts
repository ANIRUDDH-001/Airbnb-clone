// Hand-written mirrors of the FastAPI (Pydantic) response and request shapes. Keep in sync with backend/app/schemas.

export type ISODate = string; // "YYYY-MM-DD"
export type ISODateTime = string; // UTC, e.g. "2026-09-25T13:55:49Z"

export type PropertyType =
  | "house" | "flat" | "guest_house" | "hotel" | "villa" | "cabin" | "cottage" | "tiny_home" | "farm_stay" | "houseboat";
export type RoomType = "entire_home" | "private_room" | "shared_room";
export type SortOption = "recommended" | "price_asc" | "price_desc" | "rating";
export type BookingPhase = "upcoming" | "past" | "cancelled";

export interface Page<T> {
  items: T[];
  page: number;
  page_size: number;
  total: number;
  has_more: boolean;
}

export interface User {
  id: number;
  name: string;
  email: string;
  avatar_url: string | null;
  is_superhost: boolean;
  is_host: boolean;
}

export interface PersonSummary {
  id: number;
  name: string;
  avatar_url: string | null;
}

export interface Category {
  slug: string;
  name: string;
  icon: string;
}

export interface Amenity {
  code: string;
  name: string;
  icon: string;
  group_name: string;
}

export interface Destination {
  name: string;
  state: string;
  country: string;
  latitude: number;
  longitude: number;
  blurb: string;
}

export interface StayPrice {
  nights: number;
  total: number;
}

export interface ListingCard {
  id: number;
  title: string;
  property_type: PropertyType;
  room_type: RoomType;
  city: string;
  state: string | null;
  country: string;
  latitude: number;
  longitude: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  max_guests: number;
  nightly_price: number;
  rating_avg: number | null;
  review_count: number;
  is_guest_favourite: boolean;
  photos: string[];
  stay_price: StayPrice | null;
  is_wishlisted: boolean;
}

export interface HostListing extends ListingCard {
  upcoming_reservations: number;
}

export interface HostSummary {
  id: number;
  name: string;
  avatar_url: string | null;
  bio: string | null;
  is_superhost: boolean;
  hosting_since: ISODate;
  listing_count: number;
  review_count: number;
  rating_avg: number | null;
}

export interface RatingBreakdown {
  cleanliness: number;
  accuracy: number;
  check_in: number;
  communication: number;
  location: number;
  value: number;
}

export interface ListingDetail {
  id: number;
  title: string;
  description: string;
  property_type: PropertyType;
  room_type: RoomType;
  max_guests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  nightly_price: number;
  cleaning_fee: number;
  address: string;
  city: string;
  state: string | null;
  country: string;
  latitude: number;
  longitude: number;
  rating_avg: number | null;
  review_count: number;
  is_guest_favourite: boolean;
  photos: string[];
  amenities: Amenity[];
  categories: Category[];
  host: HostSummary;
  rating_breakdown: RatingBreakdown | null;
  is_wishlisted: boolean;
}

export interface Review {
  id: number;
  author_name: string;
  author_avatar_url: string | null;
  rating: number;
  comment: string;
  created_at: ISODateTime;
}

export interface ReviewCreate {
  rating: number;
  cleanliness: number;
  accuracy: number;
  check_in: number;
  communication: number;
  location: number;
  value: number;
  comment: string;
}

export interface DateRange {
  check_in: ISODate;
  check_out: ISODate;
}

export interface Availability {
  listing_id: number;
  start: ISODate;
  end: ISODate;
  booked: DateRange[];
}

export interface PriceQuote {
  nightly_price: number;
  nights: number;
  subtotal: number;
  cleaning_fee: number;
  service_fee: number;
  taxes: number;
  total: number;
}

export interface Guests {
  adults: number;
  children: number;
  infants: number;
}

export interface BookingCreate extends Guests {
  listing_id: number;
  check_in: ISODate;
  check_out: ISODate;
}

export interface BookingListing {
  id: number;
  title: string;
  property_type: PropertyType;
  room_type: RoomType;
  city: string;
  state: string | null;
  country: string;
  photo_url: string | null;
  host: PersonSummary;
}

export interface Booking extends Guests {
  id: number;
  check_in: ISODate;
  check_out: ISODate;
  status: "confirmed" | "cancelled";
  phase: BookingPhase;
  nightly_price: number;
  nights: number;
  subtotal: number;
  cleaning_fee: number;
  service_fee: number;
  taxes: number;
  total: number;
  created_at: ISODateTime;
  cancelled_at: ISODateTime | null;
  listing: BookingListing;
  guest: PersonSummary;
  can_cancel: boolean;
  can_review: boolean;
  has_review: boolean;
}

/** Body of POST/PUT /host/listings. PUT replaces everything, including photos, amenities and categories. */
export interface ListingWrite {
  title: string;
  description: string;
  property_type: PropertyType;
  room_type: RoomType;
  max_guests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  nightly_price: number;
  cleaning_fee: number;
  address: string;
  city: string;
  state: string | null;
  country: string;
  latitude: number;
  longitude: number;
  photo_urls: string[];
  amenity_codes: string[];
  category_slugs: string[];
}
