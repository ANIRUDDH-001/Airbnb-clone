"use client";

import { Star } from "lucide-react";
import Link from "next/link";

import type { ListingCard as Card } from "@/lib/api/types";
import { cardHeading, formatINR, formatRating, plural } from "@/lib/format";

import { HeartButton } from "./HeartButton";
import { PhotoCarousel } from "./PhotoCarousel";
import { useWishlist } from "./useWishlist";

interface ListingCardProps {
  listing: Card;
  /** Query string carried to the detail page (dates and guests from the search). */
  query?: string;
  priority?: boolean;
  onWishlistChange?: (saved: boolean) => void;
}

export function ListingCard({ listing, query = "", priority, onWishlistChange }: ListingCardProps) {
  const { saved, toggle } = useWishlist(listing.id, listing.is_wishlisted, onWishlistChange);
  const heading = cardHeading(listing.property_type, listing.room_type, listing.city);

  return (
    <Link href={`/rooms/${listing.id}${query}`} className="group block">
      <div className="relative">
        <PhotoCarousel photos={listing.photos} alt={listing.title} priority={priority} />
        {listing.is_guest_favourite && (
          <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1.5 text-[13px] font-semibold shadow-sm">
            Guest favourite
          </span>
        )}
        <HeartButton saved={saved} onToggle={toggle} className="absolute right-3 top-3" />
      </div>

      <div className="mt-3 text-[15px] leading-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate font-semibold">{heading}</h3>
          <span className="flex shrink-0 items-center gap-1">
            {listing.rating_avg !== null ? (
              <>
                <Star className="size-3 fill-ink" aria-hidden />
                <span>{formatRating(listing.rating_avg)}</span>
                <span className="sr-only">out of 5, {plural(listing.review_count, "review")}</span>
              </>
            ) : (
              <span>New</span>
            )}
          </span>
        </div>
        <p className="truncate text-muted">{listing.title}</p>
        <p className="text-muted">
          {plural(listing.beds, "bed")} · {plural(listing.max_guests, "guest")}
        </p>
        <p className="mt-1.5">
          {listing.stay_price ? (
            <>
              <span className="font-semibold underline">{formatINR(listing.stay_price.total)}</span>{" "}
              for {plural(listing.stay_price.nights, "night")}
            </>
          ) : (
            <>
              <span className="font-semibold">{formatINR(listing.nightly_price)}</span> night
            </>
          )}
        </p>
      </div>
    </Link>
  );
}
