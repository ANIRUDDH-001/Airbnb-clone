import Link from "next/link";

import { HomeCategoryBar } from "@/components/listing/HomeCategoryBar";
import { ListingGrid } from "@/components/listing/ListingGrid";
import { serverGet } from "@/lib/api/server";
import type { Category, ListingCard, Page } from "@/lib/api/types";

const PAGE_SIZE = 20;

export default async function HomePage(props: PageProps<"/">) {
  const { category } = await props.searchParams;
  const categories = await serverGet<Category[]>("/categories");
  const active = typeof category === "string" && categories.some((c) => c.slug === category) ? category : null;
  const query = { category: active, page_size: PAGE_SIZE };
  const listings = await serverGet<Page<ListingCard>>("/listings", query);

  return (
    <div className="mx-auto max-w-[1880px] px-6 lg:px-10 xl:px-20">
      <div className="sticky top-[var(--header-h,80px)] z-30 -mx-6 bg-white px-6 pb-2 shadow-[0_1px_0_#ebebeb] lg:-mx-10 lg:px-10 xl:-mx-20 xl:px-20">
        <HomeCategoryBar categories={categories} active={active} />
      </div>

      <div className="pt-6">
        {listings.items.length ? (
          <ListingGrid key={active ?? "all"} initial={listings} query={query} />
        ) : (
          <div className="py-24 text-center">
            <h2 className="text-[22px] font-semibold">No homes in this category yet</h2>
            <p className="mt-2 text-muted">Try another category, or browse everything.</p>
            <Link href="/" className="mt-6 inline-block rounded-lg border border-ink px-6 py-3 font-semibold hover:bg-soft">
              Show all homes
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
