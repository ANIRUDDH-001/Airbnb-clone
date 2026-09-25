"use client";

import { useState } from "react";
import { toast } from "sonner";

import { api, ApiError } from "@/lib/api/client";
import type { Query } from "@/lib/api/core";
import type { ListingCard as Card, Page } from "@/lib/api/types";

import { ListingCard } from "./ListingCard";

export const GRID_CLASSES =
  "grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 min-[1880px]:grid-cols-6";

interface ListingGridProps {
  initial: Page<Card>;
  /** The /listings query that produced `initial`; "Show more" asks for the next page of it. */
  query: Query;
  /** Dates and guests carried to the detail page. */
  linkQuery?: string;
}

/** The home grid. Render it with `key` set to the query so a new category starts from page 1. */
export function ListingGrid({ initial, query, linkQuery }: ListingGridProps) {
  const [pages, setPages] = useState([initial]);
  const [loading, setLoading] = useState(false);
  const last = pages[pages.length - 1];
  const listings = pages.flatMap((page) => page.items);

  async function showMore() {
    setLoading(true);
    try {
      const next = await api.get<Page<Card>>("/listings", { ...query, page: last.page + 1 });
      setPages((current) => [...current, next]);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't load more homes");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <ul className={GRID_CLASSES}>
        {listings.map((listing, index) => (
          <li key={listing.id}>
            <ListingCard listing={listing} query={linkQuery} priority={index < 4} />
          </li>
        ))}
      </ul>

      {last.has_more && (
        <div className="mt-14 flex flex-col items-center gap-4">
          <p className="text-[17px] font-semibold">Continue exploring homes</p>
          <button
            type="button"
            onClick={showMore}
            disabled={loading}
            className="rounded-lg bg-ink px-6 py-3.5 font-semibold text-white transition hover:bg-black disabled:opacity-60"
          >
            {loading ? "Loading…" : "Show more"}
          </button>
        </div>
      )}
    </>
  );
}
