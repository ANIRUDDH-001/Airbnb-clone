"use client";

import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { api } from "@/lib/api/client";
import type { Destination } from "@/lib/api/types";
import { DEFAULT_SEARCH, parseSearch, type SearchState, searchHref } from "@/lib/search";

let destinationsRequest: Promise<Destination[]> | null = null;

/** The 12 destinations, fetched once per page load and shared by every search bar. */
export function useDestinations(): Destination[] {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  useEffect(() => {
    destinationsRequest ??= api.get<Destination[]>("/destinations").catch(() => {
      destinationsRequest = null; // let a later mount retry
      return [];
    });
    let live = true;
    destinationsRequest.then((list) => live && setDestinations(list));
    return () => {
      live = false;
    };
  }, []);
  return destinations;
}

/** The search in the URL (on /s/… pages), or the defaults elsewhere. */
export function useCurrentSearch(): SearchState {
  const pathname = usePathname();
  const params = useParams<{ location?: string }>();
  const searchParams = useSearchParams();
  return useMemo(() => {
    if (!pathname.startsWith("/s/") || !params.location) return DEFAULT_SEARCH;
    const raw: Record<string, string | string[]> = {};
    for (const key of new Set(searchParams.keys())) {
      const values = searchParams.getAll(key);
      raw[key] = values.length > 1 ? values : values[0];
    }
    return parseSearch(params.location, raw);
  }, [pathname, params.location, searchParams]);
}

/**
 * Editable copy of the current search. Submitting keeps the page's filters, category and sort,
 * resets to page 1, and navigates to the results URL.
 */
export function useSearchDraft() {
  const router = useRouter();
  const current = useCurrentSearch();
  const [draft, setDraft] = useState(current);
  const [synced, setSynced] = useState(current);

  // A navigation changed the URL: start editing from it.
  if (current !== synced) {
    setSynced(current);
    setDraft(current);
  }

  return {
    draft,
    current,
    update: (patch: Partial<SearchState>) => setDraft((state) => ({ ...state, ...patch })),
    reset: () => setDraft(current),
    submit: () => router.push(searchHref({ ...draft, page: 1 })),
  };
}
