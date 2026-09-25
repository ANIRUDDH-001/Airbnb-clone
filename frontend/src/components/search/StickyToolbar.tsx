"use client";

import { type ReactNode, useRef } from "react";

import { usePublishedHeight } from "@/components/ui/usePublishedHeight";

/** The search page's sticky filter row. Publishes `--toolbar-h` so the map can sit just below it. */
export function StickyToolbar({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  usePublishedHeight(ref, "--toolbar-h");
  return (
    <div ref={ref} className="sticky top-[var(--header-h,80px)] z-30 -mx-6 bg-white px-6 py-3 lg:-mx-10 lg:px-10 xl:-mx-20 xl:px-20">
      {children}
    </div>
  );
}
