"use client";

import clsx from "clsx";
import { ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { NamedIcon } from "@/components/ui/icons";
import type { Category } from "@/lib/api/types";

interface CategoryBarProps {
  categories: Category[];
  active: string | null;
  onOpenFilters: () => void;
  filterCount?: number;
}

/** The brief's icon row: scrollable categories with arrow buttons, plus the Filters button. */
export function CategoryBar({ categories, active, onOpenFilters, filterCount = 0 }: CategoryBarProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  function updateEdges() {
    const element = scroller.current;
    if (!element) return;
    setEdges({
      start: element.scrollLeft <= 4,
      end: element.scrollLeft + element.clientWidth >= element.scrollWidth - 4,
    });
  }

  useEffect(() => {
    const element = scroller.current;
    if (!element) return;
    const observer = new ResizeObserver(updateEdges);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  function scrollBy(direction: 1 | -1) {
    const element = scroller.current;
    element?.scrollBy({ left: direction * element.clientWidth * 0.7, behavior: "smooth" });
  }

  return (
    <div className="flex items-center gap-6">
      <div className="relative min-w-0 flex-1">
        {!edges.start && <EdgeArrow side="left" onClick={() => scrollBy(-1)} />}
        <div ref={scroller} onScroll={updateEdges} className="no-scrollbar flex gap-8 overflow-x-auto scroll-smooth">
          {categories.map((category) => {
            const isActive = category.slug === active;
            return (
              <Link
                key={category.slug}
                href={isActive ? "/" : `/?category=${category.slug}`}
                scroll={false}
                aria-current={isActive ? "page" : undefined}
                className={clsx(
                  "group flex shrink-0 flex-col items-center gap-2 border-b-2 pb-3 pt-4 transition",
                  isActive ? "border-ink text-ink" : "border-transparent text-muted hover:border-line hover:text-ink",
                )}
              >
                <NamedIcon name={category.icon} className="size-6" strokeWidth={1.6} />
                <span className="whitespace-nowrap text-xs font-semibold">{category.name}</span>
              </Link>
            );
          })}
        </div>
        {!edges.end && <EdgeArrow side="right" onClick={() => scrollBy(1)} />}
      </div>

      <button
        type="button"
        onClick={onOpenFilters}
        className="relative hidden h-12 shrink-0 items-center gap-2 rounded-xl border border-line px-4 text-xs font-semibold transition hover:border-ink hover:bg-soft md:flex"
      >
        <SlidersHorizontal className="size-4" /> Filters
        {filterCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-ink text-[10px] text-white">
            {filterCount}
          </span>
        )}
      </button>
    </div>
  );
}

function EdgeArrow({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <div
      className={clsx(
        "absolute inset-y-0 z-10 flex items-center",
        side === "left" ? "left-0 bg-gradient-to-r from-white from-60% pr-8" : "right-0 bg-gradient-to-l from-white from-60% pl-8",
      )}
    >
      <button
        type="button"
        onClick={onClick}
        aria-label={side === "left" ? "Scroll categories left" : "Scroll categories right"}
        className="grid size-7 place-items-center rounded-full border border-line bg-white transition hover:scale-105 hover:shadow-card"
      >
        <Icon className="size-3.5" strokeWidth={2.5} />
      </button>
    </div>
  );
}
