import Link from "next/link";

/** Wordmark plus a simple original mark (the real Bélo is a registered trademark, so it isn't copied). */
export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} aria-label="Airbnb clone home" className="flex items-center gap-1.5 text-brand">
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden fill="none" stroke="currentColor" strokeWidth="2.6"
           strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 4c-1.6 0-2.6 1-3.5 2.8L5.6 21.2C4 24.6 6 28 9.4 28c2.4 0 4.3-1.6 6.6-4.4 2.3 2.8 4.2 4.4 6.6 4.4 3.4 0 5.4-3.4 3.8-6.8L19.5 6.8C18.6 5 17.6 4 16 4Z" />
        <path d="M16 23.6c-2.2-2.8-3.4-5-3.4-6.8a3.4 3.4 0 0 1 6.8 0c0 1.8-1.2 4-3.4 6.8Z" />
      </svg>
      <span className="hidden text-[22px] font-extrabold tracking-tight lg:inline">airbnb</span>
    </Link>
  );
}
