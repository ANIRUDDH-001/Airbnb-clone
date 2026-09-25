import clsx from "clsx";
import type { Metadata } from "next";
import Link from "next/link";

import { LoginPrompt } from "@/components/auth/LoginPrompt";
import { TripCard } from "@/components/trips/TripCard";
import { getViewer, serverGet } from "@/lib/api/server";
import type { Booking, BookingPhase } from "@/lib/api/types";

export const metadata: Metadata = { title: "Trips" };

const TABS: { phase: BookingPhase; label: string; empty: string }[] = [
  { phase: "upcoming", label: "Upcoming", empty: "No trips booked… yet! Time to dust off your bags and start planning your next adventure." },
  { phase: "past", label: "Past", empty: "Trips you've taken will show up here." },
  { phase: "cancelled", label: "Cancelled", empty: "You haven't cancelled any trips." },
];

export default async function TripsPage(props: PageProps<"/trips">) {
  const viewer = await getViewer();
  if (!viewer) return <LoginPrompt title="Trips" message="Log in to see your upcoming and past trips." />;

  const { tab } = await props.searchParams;
  const active = TABS.find((t) => t.phase === tab) ?? TABS[0];
  const trips = await serverGet<Booking[]>("/bookings/mine");
  const counts = Object.fromEntries(TABS.map((t) => [t.phase, trips.filter((b) => b.phase === t.phase).length]));
  // Upcoming soonest first; past and cancelled most recent first.
  const shown = trips.filter((b) => b.phase === active.phase);
  if (active.phase !== "upcoming") shown.reverse();

  return (
    <div className="mx-auto max-w-[1120px] px-6 pb-16 pt-8 md:px-10 md:pt-12">
      <h1 className="text-[32px] font-semibold">Trips</h1>

      <nav aria-label="Trip status" className="mt-6 flex gap-6 border-b border-line">
        {TABS.map(({ phase, label }) => (
          <Link
            key={phase}
            href={phase === "upcoming" ? "/trips" : `/trips?tab=${phase}`}
            aria-current={phase === active.phase ? "page" : undefined}
            className={clsx(
              "-mb-px border-b-2 pb-3 text-sm font-semibold transition",
              phase === active.phase ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink",
            )}
          >
            {label} <span className="font-normal text-muted">({counts[phase]})</span>
          </Link>
        ))}
      </nav>

      {shown.length ? (
        <ul className="mt-8 space-y-6">
          {shown.map((booking) => (
            <li key={booking.id}><TripCard booking={booking} /></li>
          ))}
        </ul>
      ) : (
        <div className="mt-8 border-b border-line pb-12">
          <p className="max-w-md text-lg">{active.empty}</p>
          <Link href="/" className="mt-6 inline-block rounded-lg border border-ink px-6 py-3 font-semibold hover:bg-soft">
            Start searching
          </Link>
        </div>
      )}
    </div>
  );
}
