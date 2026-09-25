import { Plus, Star } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { LoginPrompt } from "@/components/auth/LoginPrompt";
import { DeleteListingButton } from "@/components/host/DeleteListingButton";
import { getViewer, serverGet } from "@/lib/api/server";
import type { HostListing } from "@/lib/api/types";
import { cardHeading, formatINR, formatRating, plural, sizedPhoto } from "@/lib/format";

export const metadata: Metadata = { title: "Hosting · Listings" };

export default async function HostListingsPage() {
  const viewer = await getViewer();
  if (!viewer) return <LoginPrompt title="Your listings" message="Log in to manage your listings. Try the demo host account." />;

  const listings = await serverGet<HostListing[]>("/host/listings");

  return (
    <div className="mx-auto max-w-[1280px] px-6 pb-16 pt-8 md:px-10 md:pt-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-[32px] font-semibold">Your listings</h1>
        <Link href="/hosting/listings/new" aria-label="Create listing"
              className="bg-brand-gradient inline-flex items-center gap-2 rounded-lg px-5 py-3 font-semibold text-white">
          <Plus className="size-4" /> Create listing
        </Link>
      </div>

      {listings.length ? (
        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => (
            <li key={listing.id} className="flex flex-col overflow-hidden rounded-2xl border border-line">
              <Link href={`/rooms/${listing.id}`} className="relative block">
                {/* eslint-disable-next-line @next/next/no-img-element -- remote photos are served as-is */}
                <img src={sizedPhoto(listing.photos[0], 720)} alt="" className="aspect-[3/2] w-full object-cover" />
                <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold shadow">
                  <span className="size-2 rounded-full bg-[#008a05]" /> Listed
                </span>
              </Link>
              <div className="flex flex-1 flex-col p-5">
                <p className="text-sm text-muted">{cardHeading(listing.property_type, listing.room_type, listing.city)}</p>
                <h2 className="mt-0.5 font-semibold leading-5">{listing.title}</h2>
                <p className="mt-2 text-sm">
                  <span className="font-semibold">{formatINR(listing.nightly_price)}</span> night
                  {" · "}
                  {listing.rating_avg !== null ? (
                    <span className="inline-flex items-center gap-1"><Star className="size-3 fill-ink" /> {formatRating(listing.rating_avg)} ({listing.review_count})</span>
                  ) : "New"}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {listing.upcoming_reservations ? plural(listing.upcoming_reservations, "upcoming reservation") : "No upcoming reservations"}
                </p>
                <div className="mt-auto flex items-center gap-2 pt-5">
                  <Link href={`/hosting/listings/${listing.id}/edit`} className="rounded-lg border border-ink px-4 py-2 text-sm font-semibold hover:bg-soft">
                    Edit
                  </Link>
                  <Link href={`/rooms/${listing.id}`} className="rounded-lg px-3 py-2 text-sm font-semibold underline hover:bg-soft">
                    View
                  </Link>
                  <span className="flex-1" />
                  <DeleteListingButton listingId={listing.id} title={listing.title} upcoming={listing.upcoming_reservations} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-8 rounded-2xl border border-line p-10 text-center">
          <h2 className="text-[22px] font-semibold">No listings yet</h2>
          <p className="mt-2 text-muted">Create your first listing: it goes live in search straight away.</p>
        </div>
      )}
    </div>
  );
}
