import type { Metadata } from "next";

import { LoginPrompt } from "@/components/auth/LoginPrompt";
import { WishlistGrid } from "@/components/listing/WishlistGrid";
import { getViewer, serverGet } from "@/lib/api/server";
import type { ListingCard } from "@/lib/api/types";

export const metadata: Metadata = { title: "Wishlists" };

export default async function WishlistsPage() {
  const viewer = await getViewer();
  if (!viewer) return <LoginPrompt title="Wishlists" message="Log in to see the places you've saved." />;

  const saved = await serverGet<ListingCard[]>("/wishlist");
  return (
    <div className="mx-auto max-w-[1880px] px-6 pb-16 pt-8 md:pt-12 lg:px-10 xl:px-20">
      <h1 className="mb-8 text-[32px] font-semibold">Wishlists</h1>
      <WishlistGrid initial={saved} />
    </div>
  );
}
