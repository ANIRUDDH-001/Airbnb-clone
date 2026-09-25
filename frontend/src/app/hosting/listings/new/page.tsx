import type { Metadata } from "next";

import { LoginPrompt } from "@/components/auth/LoginPrompt";
import { ListingForm } from "@/components/host/ListingForm";
import { getViewer, serverGet } from "@/lib/api/server";
import type { Amenity, Category, Destination } from "@/lib/api/types";
import { emptyDraft } from "@/lib/listing-form";

export const metadata: Metadata = { title: "Create a listing" };

export default async function NewListingPage() {
  const viewer = await getViewer();
  if (!viewer) return <LoginPrompt title="Airbnb your home" message="Log in to create a listing. Any demo account can host." />;

  const [amenities, categories, destinations] = await Promise.all([
    serverGet<Amenity[]>("/amenities"),
    serverGet<Category[]>("/categories"),
    serverGet<Destination[]>("/destinations"),
  ]);

  return (
    <div className="mx-auto max-w-[760px] px-6 pt-8 md:pt-12">
      <ListingForm mode="create" initial={emptyDraft()} amenities={amenities} categories={categories} destinations={destinations} />
    </div>
  );
}
