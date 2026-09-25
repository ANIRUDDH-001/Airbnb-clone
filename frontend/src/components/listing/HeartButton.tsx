"use client";

import clsx from "clsx";
import { Heart } from "lucide-react";

interface HeartButtonProps {
  saved: boolean;
  onToggle: () => void;
  className?: string;
}

/** The card heart: white outline over a translucent dark fill; brand red when saved. */
export function HeartButton({ saved, onToggle, className }: HeartButtonProps) {
  return (
    <button
      type="button"
      aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
      aria-pressed={saved}
      onClick={(event) => {
        event.preventDefault(); // the card is a link
        event.stopPropagation();
        onToggle();
      }}
      className={clsx("grid size-8 place-items-center transition active:scale-90", className)}
    >
      <Heart
        className={clsx("size-6 drop-shadow", saved ? "fill-brand text-white" : "fill-black/50 text-white")}
        strokeWidth={2}
      />
    </button>
  );
}
