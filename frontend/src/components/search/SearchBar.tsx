"use client";

import { Search } from "lucide-react";
import Link from "next/link";

// Placeholder until Phase 3 (task S2) adds the Where / When / Who panels.
export function SearchBar({ variant }: { variant: "expanded" | "compact" | "mobile" }) {
  if (variant === "mobile") {
    return (
      <Link href="/s/anywhere/homes" className="flex h-14 items-center justify-center gap-2 rounded-full border border-line text-sm font-semibold shadow-search">
        <Search className="size-4" strokeWidth={2.5} /> Start your search
      </Link>
    );
  }
  if (variant === "compact") {
    return (
      <Link href="/s/anywhere/homes" className="flex h-12 items-center rounded-full border border-line pl-6 pr-2 text-sm font-semibold shadow-search">
        Anywhere <span className="mx-4 h-6 w-px bg-line" /> Any week <span className="mx-4 h-6 w-px bg-line" />
        <span className="font-normal text-muted">Add guests</span>
        <span className="ml-3 grid size-8 place-items-center rounded-full bg-brand text-white"><Search className="size-3.5" strokeWidth={3} /></span>
      </Link>
    );
  }
  return (
    <Link href="/s/anywhere/homes" className="flex h-16 w-[850px] max-w-full items-center rounded-full border border-line pl-8 pr-2 shadow-search">
      <span className="flex-1 text-xs font-semibold">Where<span className="block text-sm font-normal text-muted">Search destinations</span></span>
      <span className="flex-1 text-xs font-semibold">When<span className="block text-sm font-normal text-muted">Add dates</span></span>
      <span className="flex-1 text-xs font-semibold">Who<span className="block text-sm font-normal text-muted">Add guests</span></span>
      <span className="grid size-12 place-items-center rounded-full bg-brand text-white"><Search className="size-4" strokeWidth={3} /></span>
    </Link>
  );
}
