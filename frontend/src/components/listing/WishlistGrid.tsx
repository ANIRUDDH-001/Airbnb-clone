"use client";

import { Heart } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import type { ListingCard as Card } from "@/lib/api/types";

import { GRID_CLASSES } from "./grid";
import { ListingCard } from "./ListingCard";

/** Saved homes. Un-hearting a card removes it here straight away (it can be re-saved from the listing). */
export function WishlistGrid({ initial }: { initial: Card[] }) {
  const [removed, setRemoved] = useState<Set<number>>(new Set());
  const listings = initial.filter((listing) => !removed.has(listing.id));

  if (!listings.length) {
    return (
      <div className="max-w-md border-b border-line pb-12 pt-4">
        <Heart className="size-10" strokeWidth={1.4} />
        <h2 className="mt-4 text-[22px] font-semibold">Create your first wishlist</h2>
        <p className="mt-2 text-muted">As you search, tap the heart icon to save your favourite places to stay.</p>
        <Link href="/" className="mt-6 inline-block rounded-lg bg-ink px-6 py-3 font-semibold text-white hover:bg-black">
          Start exploring
        </Link>
      </div>
    );
  }

  return (
    <ul className={GRID_CLASSES}>
      {listings.map((listing) => (
        <li key={listing.id}>
          <ListingCard
            listing={listing}
            onWishlistChange={(saved) =>
              setRemoved((current) => {
                const next = new Set(current);
                if (saved) next.delete(listing.id); // a failed unsave rolls back: show it again
                else next.add(listing.id);
                return next;
              })
            }
          />
        </li>
      ))}
    </ul>
  );
}
