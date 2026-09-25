import clsx from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

interface PaginationProps {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
}

/** 1 2 3 … 9 — the current page, its neighbours, and the ends (as on the live search page). */
export function pageNumbers(page: number, totalPages: number): (number | "gap")[] {
  const wanted = new Set([1, totalPages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= totalPages));
  const sorted = [...wanted].sort((a, b) => a - b);
  const result: (number | "gap")[] = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) result.push("gap");
    result.push(n);
  });
  return result;
}

export function Pagination({ page, totalPages, hrefFor }: PaginationProps) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label="Search results pages" className="flex items-center justify-center gap-2">
      <ArrowLink href={page > 1 ? hrefFor(page - 1) : null} label="Previous">
        <ChevronLeft className="size-4" strokeWidth={2.5} />
      </ArrowLink>
      {pageNumbers(page, totalPages).map((n, i) =>
        n === "gap" ? (
          <span key={`gap${i}`} className="px-1 text-muted">…</span>
        ) : (
          <Link
            key={n}
            href={hrefFor(n)}
            aria-current={n === page ? "page" : undefined}
            className={clsx(
              "grid size-8 place-items-center rounded-full text-sm font-semibold",
              n === page ? "bg-ink text-white" : "hover:bg-soft hover:underline",
            )}
          >
            {n}
          </Link>
        ),
      )}
      <ArrowLink href={page < totalPages ? hrefFor(page + 1) : null} label="Next">
        <ChevronRight className="size-4" strokeWidth={2.5} />
      </ArrowLink>
    </nav>
  );
}

function ArrowLink({ href, label, children }: { href: string | null; label: string; children: React.ReactNode }) {
  if (!href) {
    return <span aria-hidden className="grid size-8 place-items-center rounded-full text-[#dddddd]">{children}</span>;
  }
  return (
    <Link href={href} aria-label={label} className="grid size-8 place-items-center rounded-full hover:bg-soft">
      {children}
    </Link>
  );
}
