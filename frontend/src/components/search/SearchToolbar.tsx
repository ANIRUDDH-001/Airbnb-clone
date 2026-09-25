"use client";

import clsx from "clsx";
import { SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { NamedIcon } from "@/components/ui/icons";
import type { Amenity, SortOption } from "@/lib/api/types";
import { activeFilterCount, type SearchState, searchHref } from "@/lib/search";

import { FiltersModal } from "./FiltersModal";

// One-tap amenity chips shown above the results, as on the live site.
const QUICK_AMENITIES = ["wifi", "pool", "kitchen", "air_conditioning", "free_parking", "beach_access", "self_check_in", "washer"];

const SORTS: { value: SortOption; label: string }[] = [
  { value: "recommended", label: "Recommended" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "rating", label: "Top rated" },
];

interface SearchToolbarProps {
  search: SearchState;
  amenities: Amenity[];
  /** Arrived from the home page's Filters button. */
  openFilters?: boolean;
}

export function SearchToolbar({ search, amenities, openFilters = false }: SearchToolbarProps) {
  const router = useRouter();
  const [filtersOpen, setFiltersOpen] = useState(openFilters);
  const count = activeFilterCount(search.filters);
  const byCode = new Map(amenities.map((amenity) => [amenity.code, amenity]));

  const chipHref = (code: string) => {
    const selected = search.filters.amenities;
    const next = selected.includes(code) ? selected.filter((c) => c !== code) : [...selected, code];
    return searchHref({ ...search, page: 1, filters: { ...search.filters, amenities: next } });
  };

  return (
    <div className="flex items-center gap-3">
      <div className="no-scrollbar flex min-w-0 flex-1 gap-2 overflow-x-auto py-1">
        {QUICK_AMENITIES.map((code) => {
          const amenity = byCode.get(code);
          if (!amenity) return null;
          const on = search.filters.amenities.includes(code);
          return (
            <Link
              key={code}
              href={chipHref(code)}
              scroll={false}
              aria-pressed={on}
              className={clsx(
                "flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm transition",
                on ? "border-ink bg-soft font-semibold" : "border-line hover:border-ink",
              )}
            >
              <NamedIcon name={amenity.icon} className="size-4" strokeWidth={1.8} />
              {amenity.name}
            </Link>
          );
        })}
      </div>

      <label className="relative hidden shrink-0 sm:block">
        <span className="sr-only">Sort by</span>
        <select
          value={search.sort}
          onChange={(event) => router.push(searchHref({ ...search, page: 1, sort: event.target.value as SortOption }))}
          className="h-10 cursor-pointer appearance-none rounded-full border border-line bg-white pl-4 pr-9 text-sm font-semibold hover:border-ink"
        >
          {SORTS.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs">▾</span>
      </label>

      <button
        type="button"
        onClick={() => setFiltersOpen(true)}
        className={clsx(
          "relative flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition hover:border-ink",
          count ? "border-ink bg-soft" : "border-line",
        )}
      >
        <SlidersHorizontal className="size-4" /> Filters
        {count > 0 && (
          <span className="grid size-5 place-items-center rounded-full bg-ink text-[10px] text-white">{count}</span>
        )}
      </button>

      <FiltersModal
        open={filtersOpen}
        onClose={() => {
          setFiltersOpen(false);
          if (openFilters) router.replace(searchHref(search), { scroll: false }); // drop ?filters=open
        }}
        search={search}
        amenities={amenities}
        onApply={(filters) => {
          setFiltersOpen(false);
          router.push(searchHref({ ...search, page: 1, filters }));
        }}
      />
    </div>
  );
}
