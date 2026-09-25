"use client";

import clsx from "clsx";
import { List, Map as MapIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { type PointerEvent, type ReactNode, useState } from "react";

import type { ListingCard as Card } from "@/lib/api/types";

// Leaflet needs `window`; loading it lazily also keeps it out of every other page's bundle.
const SearchMap = dynamic(() => import("./SearchMap").then((m) => m.SearchMap), {
  ssr: false,
  loading: () => <div className="size-full animate-pulse bg-soft" />,
});

interface SearchResultsProps {
  listings: Card[];
  linkQuery: string;
  /** The results grid and pagination. Cards must carry `data-listing-id` so hovering one highlights its pin. */
  children: ReactNode;
}

/** Results beside a sticky map on large screens; on smaller ones a floating button swaps the list for the map. */
export function SearchResults({ listings, linkQuery, children }: SearchResultsProps) {
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [mapOpen, setMapOpen] = useState(false);

  function trackHover(event: PointerEvent) {
    if (event.pointerType !== "mouse") return;
    const card = (event.target as Element).closest<HTMLElement>("[data-listing-id]");
    const id = card ? Number(card.dataset.listingId) : null;
    setHoveredId((current) => (current === id ? current : id));
  }

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,40%)] lg:gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,38%)]">
      <div onPointerOver={trackHover} onPointerLeave={() => setHoveredId(null)}>
        {children}
      </div>

      {/* Phones and tablets: a full-screen layer under the filter row. Large screens: a sticky panel beside the list. */}
      <div
        className={clsx(
          "lg:block",
          mapOpen
            ? "fixed inset-x-0 bottom-0 top-[calc(var(--header-h,80px)+var(--toolbar-h,64px))] z-[45] lg:static lg:z-auto"
            : "hidden",
        )}
      >
        <div className="h-full lg:sticky lg:top-[calc(var(--header-h,80px)+var(--toolbar-h,64px))] lg:h-[calc(100dvh-var(--header-h,80px)-var(--toolbar-h,64px)-24px)] lg:overflow-hidden lg:rounded-2xl">
          <SearchMap listings={listings} linkQuery={linkQuery} hoveredId={hoveredId} />
        </div>
      </div>

      <button
        type="button"
        onClick={() => setMapOpen((open) => !open)}
        className="fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-ink px-5 py-3.5 text-sm font-semibold text-white shadow-float transition hover:scale-105 md:bottom-8 lg:hidden"
      >
        {mapOpen ? (
          <>
            Show list <List className="size-4" />
          </>
        ) : (
          <>
            Show map <MapIcon className="size-4" />
          </>
        )}
      </button>
    </div>
  );
}
