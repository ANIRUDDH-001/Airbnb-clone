import type { Metadata } from "next";
import Link from "next/link";

import { GRID_CLASSES } from "@/components/listing/grid";
import { ListingCard } from "@/components/listing/ListingCard";
import { Pagination } from "@/components/search/Pagination";
import { SearchToolbar } from "@/components/search/SearchToolbar";
import { ApiError } from "@/lib/api/core";
import { serverGet } from "@/lib/api/server";
import type { Amenity, ListingCard as Card, Page } from "@/lib/api/types";
import { formatRange, plural } from "@/lib/format";
import { apiQuery, EMPTY_FILTERS, parseSearch, searchHref, stayQuery } from "@/lib/search";

const PAGE_SIZE = 18;

export async function generateMetadata(props: PageProps<"/s/[location]/homes">): Promise<Metadata> {
  const { location } = await props.params;
  const place = parseSearch(location, {}).location;
  return { title: place ? `${place} · Homes` : "Homes" };
}

export default async function SearchPage(props: PageProps<"/s/[location]/homes">) {
  const { location } = await props.params;
  const params = await props.searchParams;
  const search = parseSearch(location, params);
  const place = search.location || "all destinations";

  const amenities = await serverGet<Amenity[]>("/amenities");
  let results: Page<Card> | null = null;
  let problem: string | null = null;
  try {
    results = await serverGet<Page<Card>>("/listings", apiQuery(search, PAGE_SIZE));
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 422) throw error;
    problem = error.message; // e.g. dates in the past, or min price above max price
  }

  const totalPages = results ? Math.max(1, Math.ceil(results.total / PAGE_SIZE)) : 1;
  const dates = search.checkIn && search.checkOut ? formatRange(search.checkIn, search.checkOut) : null;
  const linkQuery = stayQuery(search);

  return (
    <div className="mx-auto max-w-[1880px] px-6 lg:px-10 xl:px-20">
      <div className="sticky top-[var(--header-h,80px)] z-30 -mx-6 bg-white px-6 py-3 lg:-mx-10 lg:px-10 xl:-mx-20 xl:px-20">
        <SearchToolbar search={search} amenities={amenities} openFilters={params.filters === "open"} />
      </div>

      <div className="pb-6 pt-4">
        <h1 className="text-[22px] font-semibold">
          {results ? `${plural(results.total, "home")} in ${place}` : `Homes in ${place}`}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {dates ? `${dates} · Prices include all fees` : "Add dates to see the total price of your stay"}
        </p>
      </div>

      {problem ? (
        <EmptyState
          title="Let's fix that search"
          message={problem}
          action={{ label: "Clear dates and filters", href: searchHref({ ...search, checkIn: undefined, checkOut: undefined, filters: EMPTY_FILTERS, page: 1 }) }}
        />
      ) : results && results.items.length ? (
        <>
          <ul className={GRID_CLASSES}>
            {results.items.map((listing, index) => (
              <li key={listing.id}>
                <ListingCard listing={listing} query={linkQuery} priority={index < 4} />
              </li>
            ))}
          </ul>
          <div className="mt-14">
            <Pagination page={search.page} totalPages={totalPages} hrefFor={(page) => searchHref({ ...search, page })} />
            <p className="mt-4 text-center text-sm text-muted">
              {`${(search.page - 1) * PAGE_SIZE + 1} – ${Math.min(search.page * PAGE_SIZE, results.total)} of ${plural(results.total, "home")}`}
            </p>
          </div>
        </>
      ) : (
        <EmptyState
          title="No exact matches"
          message="Try changing or removing some of your filters or dates, or search a different destination."
          action={{ label: "Remove all filters", href: searchHref({ ...search, filters: EMPTY_FILTERS, category: undefined, page: 1 }) }}
        />
      )}
    </div>
  );
}

function EmptyState({ title, message, action }: { title: string; message: string; action: { label: string; href: string } }) {
  return (
    <div className="rounded-2xl border border-line px-6 py-16 text-center">
      <h2 className="text-[22px] font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-muted">{message}</p>
      <Link href={action.href} className="mt-6 inline-block rounded-lg border border-ink px-6 py-3 font-semibold hover:bg-soft">
        {action.label}
      </Link>
    </div>
  );
}
