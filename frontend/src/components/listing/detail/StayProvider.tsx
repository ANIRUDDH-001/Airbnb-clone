"use client";

import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";

import type { Stay } from "@/components/calendar/RangeCalendar";
import { api, ApiError } from "@/lib/api/client";
import type { DateRange, Guests, ISODate, PriceQuote } from "@/lib/api/types";
import { bookedNights, rangeIsFree } from "@/lib/dates";
import { stayQuery } from "@/lib/search";

export interface ListingFacts {
  id: number;
  maxGuests: number;
  nightlyPrice: number;
  city: string;
  isOwnListing: boolean;
}

interface StayContextValue extends Stay {
  listing: ListingFacts;
  guests: Guests;
  today: ISODate;
  booked: Set<ISODate>;
  setDates: (stay: Stay) => void;
  setGuests: (guests: Guests) => void;
  quote: PriceQuote | null;
  quoteError: string | null;
  quoteLoading: boolean;
  /** Where "Reserve" goes: the confirm-and-pay page with this stay. */
  bookingHref: string | null;
  /** Ask the date pickers to open (e.g. "Check availability" with no dates). */
  datePickerRequest: number;
  requestDatePicker: () => void;
}

const StayContext = createContext<StayContextValue | null>(null);

interface StayProviderProps {
  listing: ListingFacts;
  bookedRanges: DateRange[];
  today: ISODate;
  initial: Stay & Guests;
  children: ReactNode;
}

export function StayProvider({ listing, bookedRanges, today, initial, children }: StayProviderProps) {
  const booked = useMemo(() => bookedNights(bookedRanges), [bookedRanges]);

  // Dates from a search link are dropped if they're no longer bookable here.
  const initialValid =
    initial.checkIn && initial.checkOut && initial.checkIn >= today && rangeIsFree(initial.checkIn, initial.checkOut, booked);
  const [stay, setStay] = useState<Stay>(initialValid ? { checkIn: initial.checkIn, checkOut: initial.checkOut } : {});
  const [guests, setGuests] = useState<Guests>({
    adults: Math.min(Math.max(1, initial.adults), listing.maxGuests),
    children: Math.min(initial.children, Math.max(0, listing.maxGuests - Math.max(1, initial.adults))),
    infants: initial.infants,
  });
  const [quoteState, setQuoteState] = useState<{ key: string; quote: PriceQuote | null; error: string | null } | null>(null);
  const [datePickerRequest, setDatePickerRequest] = useState(0);

  const complete = Boolean(stay.checkIn && stay.checkOut);
  const query = stayQuery({ ...stay, ...guests });

  // Keep the URL shareable without a server round trip (and clean while nothing has been chosen).
  const untouched = !stay.checkIn && guests.adults === 1 && !guests.children && !guests.infants;
  useEffect(() => {
    window.history.replaceState(null, "", `${window.location.pathname}${untouched ? "" : query}`);
  }, [query, untouched]);

  // Live price quote from the backend (the single source of truth for pricing).
  useEffect(() => {
    if (!complete || listing.isOwnListing) return;
    let live = true;
    const timer = setTimeout(async () => {
      try {
        const quote = await api.get<PriceQuote>(`/listings/${listing.id}/quote`, {
          check_in: stay.checkIn, check_out: stay.checkOut, ...guests,
        });
        if (live) setQuoteState({ key: query, quote, error: null });
      } catch (error) {
        if (live) setQuoteState({ key: query, quote: null, error: error instanceof ApiError ? error.message : "Couldn't price this stay" });
      }
    }, 150);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [complete, listing.id, listing.isOwnListing, stay.checkIn, stay.checkOut, guests, query]);

  const current = complete && quoteState?.key === query ? quoteState : null;

  const value: StayContextValue = {
    ...stay,
    listing,
    guests,
    today,
    booked,
    setDates: setStay,
    setGuests,
    quote: current?.quote ?? null,
    quoteError: current?.error ?? null,
    quoteLoading: complete && !current && !listing.isOwnListing,
    bookingHref: current?.quote ? `/book/${listing.id}${query}` : null,
    datePickerRequest,
    requestDatePicker: () => setDatePickerRequest((n) => n + 1),
  };

  return <StayContext.Provider value={value}>{children}</StayContext.Provider>;
}

export function useStay(): StayContextValue {
  const context = useContext(StayContext);
  if (!context) throw new Error("useStay must be used inside <StayProvider>");
  return context;
}
