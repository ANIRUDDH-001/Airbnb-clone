import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { LoginPrompt } from "@/components/auth/LoginPrompt";
import { ListingForm } from "@/components/host/ListingForm";
import { getViewer, serverGet, serverGetOrNull } from "@/lib/api/server";
import type { Amenity, Category, Destination, ListingDetail } from "@/lib/api/types";
import { draftFromListing } from "@/lib/listing-form";

export const metadata: Metadata = { title: "Edit listing" };

export default async function EditListingPage(props: PageProps<"/hosting/listings/[id]/edit">) {
  const viewer = await getViewer();
  if (!viewer) return <LoginPrompt title="Edit listing" message="Log in as the host of this listing to edit it." />;

  const { id } = await props.params;
  if (!/^\d+$/.test(id)) notFound();
  const listing = await serverGetOrNull<ListingDetail>(`/listings/${id}`);
  // Someone else's listing looks the same as a missing one (the API would refuse the save with 403 anyway).
  if (!listing || listing.host.id !== viewer.id) notFound();

  const [amenities, categories, destinations] = await Promise.all([
    serverGet<Amenity[]>("/amenities"),
    serverGet<Category[]>("/categories"),
    serverGet<Destination[]>("/destinations"),
  ]);

  return (
    <div className="mx-auto max-w-[760px] px-6 pt-8 md:pt-12">
      <Link href="/hosting/listings" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold hover:underline">
        <ChevronLeft className="size-4" /> Listings
      </Link>
      <h1 className="mb-10 text-[32px] font-semibold leading-9">{listing.title}</h1>
      <ListingForm
        mode="edit"
        listingId={listing.id}
        initial={draftFromListing(listing)}
        amenities={amenities}
        categories={categories}
        destinations={destinations}
      />
    </div>
  );
}
