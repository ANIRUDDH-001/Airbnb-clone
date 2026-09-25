"use client";

import { Heart, Share } from "lucide-react";
import { toast } from "sonner";

import { useWishlist } from "@/components/listing/useWishlist";

export function TitleActions({ listingId, saved: initiallySaved }: { listingId: number; saved: boolean }) {
  const { saved, toggle } = useWishlist(listingId, initiallySaved);

  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast("Link copied");
    } catch {
      toast.error("Couldn't copy the link");
    }
  }

  return (
    <div className="flex shrink-0 items-center gap-1">
      <button type="button" onClick={share} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold underline hover:bg-soft">
        <Share className="size-4" /> Share
      </button>
      <button type="button" onClick={toggle} aria-pressed={saved}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold underline hover:bg-soft">
        <Heart className={saved ? "size-4 fill-brand text-brand" : "size-4"} /> {saved ? "Saved" : "Save"}
      </button>
    </div>
  );
}
