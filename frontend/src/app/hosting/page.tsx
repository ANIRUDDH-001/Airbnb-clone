import clsx from "clsx";
import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { LoginPrompt } from "@/components/auth/LoginPrompt";
import { CancelTripButton } from "@/components/trips/CancelTripButton";
import { Avatar } from "@/components/ui/Avatar";
import { getViewer, serverGet } from "@/lib/api/server";
import type { Booking, BookingPhase, HostListing } from "@/lib/api/types";
import { firstName, formatINR, formatRange, guestsLabel, plural } from "@/lib/format";

export const metadata: Metadata = { title: "Hosting · Today" };

const TABS: { phase: BookingPhase; label: string; empty: string }[] = [
  { phase: "upcoming", label: "Upcoming", empty: "You don't have any upcoming guests." },
  { phase: "past", label: "Past", empty: "Completed stays will show up here." },
  { phase: "cancelled", label: "Cancelled", empty: "No cancelled reservations." },
];

export default async function HostingTodayPage(props: PageProps<"/hosting">) {
  const viewer = await getViewer();
  if (!viewer) return <LoginPrompt title="Hosting" message="Log in to manage your listings and reservations. Try the demo host account." />;

  const [reservations, listings] = await Promise.all([
    serverGet<Booking[]>("/host/reservations"),
    serverGet<HostListing[]>("/host/listings"),
  ]);

  if (!listings.length && !reservations.length) {
    return (
      <div className="mx-auto max-w-[1120px] px-6 py-16 md:px-10">
        <h1 className="text-[32px] font-semibold">Welcome, {firstName(viewer.name)}</h1>
        <p className="mt-2 max-w-lg text-muted">You don&apos;t have any listings yet. Create one in a few steps: it goes live straight away in search.</p>
        <Link href="/hosting/listings/new" className="bg-brand-gradient mt-8 inline-flex items-center gap-2 rounded-lg px-6 py-3 font-semibold text-white">
          <Plus className="size-4" /> Create your first listing
        </Link>
      </div>
    );
  }

  const { tab } = await props.searchParams;
  const active = TABS.find((t) => t.phase === tab) ?? TABS[0];
  const counts = Object.fromEntries(TABS.map((t) => [t.phase, reservations.filter((r) => r.phase === t.phase).length]));
  const shown = reservations.filter((r) => r.phase === active.phase);
  if (active.phase !== "upcoming") shown.reverse();
  const upcomingEarnings = reservations.filter((r) => r.phase === "upcoming").reduce((sum, r) => sum + r.total, 0);

  return (
    <div className="mx-auto max-w-[1280px] px-6 pb-16 pt-8 md:px-10 md:pt-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-[32px] font-semibold">Welcome back, {firstName(viewer.name)}</h1>
        <Link href="/hosting/listings/new" className="inline-flex items-center gap-2 rounded-lg border border-ink px-4 py-2.5 text-sm font-semibold hover:bg-soft">
          <Plus className="size-4" /> Create listing
        </Link>
      </div>

      <dl className="mt-8 grid gap-4 sm:grid-cols-3">
        <Stat label="Upcoming reservations" value={String(counts.upcoming)} />
        <Stat label="Upcoming earnings" value={formatINR(upcomingEarnings)} />
        <Stat label="Active listings" value={String(listings.length)} href="/hosting/listings" />
      </dl>

      <h2 className="mt-12 text-[22px] font-semibold">Your reservations</h2>
      <nav aria-label="Reservation status" className="mt-4 flex gap-2">
        {TABS.map(({ phase, label }) => (
          <Link
            key={phase}
            href={phase === "upcoming" ? "/hosting" : `/hosting?tab=${phase}`}
            aria-current={phase === active.phase ? "page" : undefined}
            className={clsx(
              "rounded-full border px-4 py-2 text-sm font-semibold transition",
              phase === active.phase ? "border-ink bg-ink text-white" : "border-line hover:border-ink",
            )}
          >
            {label} ({counts[phase]})
          </Link>
        ))}
      </nav>

      {shown.length ? (
        <ul className="mt-6 divide-y divide-line rounded-2xl border border-line">
          {shown.map((booking) => {
            // Upcoming but no longer cancellable means check-in has passed: the guest is there now.
            const hostingNow = booking.phase === "upcoming" && !booking.can_cancel;
            return (
              <li key={booking.id} className="flex flex-col gap-4 p-5 md:flex-row md:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <Avatar name={booking.guest.name} src={booking.guest.avatar_url} size={48} />
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {booking.guest.name}
                      {hostingNow && <span className="ml-2 rounded-full bg-[#fff2e5] px-2 py-0.5 text-xs text-[#c13515]">Currently hosting</span>}
                    </p>
                    <p className="truncate text-sm text-muted">{booking.listing.title}</p>
                  </div>
                </div>
                <div className="text-sm md:w-44">
                  <p className={clsx("font-semibold", booking.phase === "cancelled" && "line-through")}>{formatRange(booking.check_in, booking.check_out)}</p>
                  <p className="text-muted">{plural(booking.nights, "night")} · {guestsLabel(booking)}</p>
                </div>
                <p className="text-sm font-semibold md:w-24 md:text-right">{formatINR(booking.total)}</p>
                <div className="flex gap-2 md:w-64 md:justify-end">
                  <Link href={`/trips/${booking.id}`} className="rounded-lg border border-line px-4 py-2 text-sm font-semibold hover:border-ink">Details</Link>
                  {booking.can_cancel && <CancelTripButton booking={booking} asHost />}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-6 rounded-2xl border border-line p-8 text-muted">{active.empty}</p>
      )}
    </div>
  );
}

function Stat({ label, value, href }: { label: string; value: string; href?: string }) {
  const body = (
    <>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1 text-[26px] font-semibold">{value}</dd>
    </>
  );
  return href ? (
    <Link href={href} className="rounded-2xl border border-line p-5 hover:border-ink">{body}</Link>
  ) : (
    <div className="rounded-2xl border border-line p-5">{body}</div>
  );
}
