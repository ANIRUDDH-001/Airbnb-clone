import { GRID_CLASSES } from "@/components/listing/grid";

/** Skeleton grid while results load (a Render cold start can take a while). */
export default function Loading() {
  return (
    <div className="mx-auto max-w-[1880px] px-6 pt-20 lg:px-10 xl:px-20" aria-busy aria-label="Loading homes">
      <div className="mb-8 h-6 w-64 animate-pulse rounded bg-hover" />
      <ul className={GRID_CLASSES}>
        {Array.from({ length: 12 }, (_, i) => (
          <li key={i}>
            <div className="aspect-[20/19] animate-pulse rounded-xl bg-hover" />
            <div className="mt-3 h-4 w-3/4 animate-pulse rounded bg-hover" />
            <div className="mt-2 h-4 w-1/2 animate-pulse rounded bg-hover" />
          </li>
        ))}
      </ul>
    </div>
  );
}
