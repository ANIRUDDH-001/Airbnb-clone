"use client";

import clsx from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState } from "react";

import { sizedPhoto } from "@/lib/format";

/**
 * Swipeable card photos: native scroll-snap (touch swipe works for free), arrows on hover, and dots.
 * Only the first photo loads eagerly; the rest load as they're scrolled into view.
 */
export function PhotoCarousel({ photos, alt, priority = false }: { photos: string[]; alt: string; priority?: boolean }) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  function go(event: React.MouseEvent, delta: number) {
    event.preventDefault(); // the card is a link
    event.stopPropagation();
    const element = track.current;
    if (element) element.scrollTo({ left: (index + delta) * element.clientWidth, behavior: "smooth" });
  }

  return (
    <div className="group/carousel relative aspect-[20/19] overflow-hidden rounded-xl bg-soft">
      <div
        ref={track}
        onScroll={(event) => {
          const element = event.currentTarget;
          setIndex(Math.round(element.scrollLeft / element.clientWidth));
        }}
        className="no-scrollbar flex size-full snap-x snap-mandatory overflow-x-auto"
      >
        {photos.map((photo, i) => (
          // eslint-disable-next-line @next/next/no-img-element -- remote photos are served as-is (next.config images.unoptimized)
          <img
            key={`${i}-${photo}`}
            src={sizedPhoto(photo, 720)}
            alt={i === 0 ? alt : `${alt}, photo ${i + 1}`}
            loading={priority && i === 0 ? "eager" : "lazy"}
            fetchPriority={priority && i === 0 ? "high" : undefined}
            draggable={false}
            className="size-full shrink-0 snap-center object-cover"
          />
        ))}
      </div>

      {photos.length > 1 && (
        <>
          {index > 0 && (
            <ArrowButton side="left" onClick={(event) => go(event, -1)} />
          )}
          {index < photos.length - 1 && (
            <ArrowButton side="right" onClick={(event) => go(event, 1)} />
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center gap-1.5" aria-hidden>
            {photos.map((photo, i) => (
              <span key={`${i}-${photo}`} className={clsx("size-1.5 rounded-full bg-white transition", i === index ? "opacity-100" : "opacity-60")} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ArrowButton({ side, onClick }: { side: "left" | "right"; onClick: (event: React.MouseEvent) => void }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "left" ? "Previous photo" : "Next photo"}
      className={clsx(
        "absolute top-1/2 hidden size-8 -translate-y-1/2 place-items-center rounded-full bg-white/90 opacity-0 shadow transition hover:scale-105 hover:bg-white group-hover/carousel:opacity-100 md:grid",
        side === "left" ? "left-3" : "right-3",
      )}
    >
      <Icon className="size-4" strokeWidth={2.5} />
    </button>
  );
}
