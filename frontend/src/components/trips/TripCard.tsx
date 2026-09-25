import { CheckCircle2 } from "lucide-react";
import Link from "next/link";

import type { Booking } from "@/lib/api/types";
import { firstName, formatINR, formatRange, guestsLabel, sizedPhoto } from "@/lib/format";

import { CancelTripButton } from "./CancelTripButton";
import { ReviewButton } from "./ReviewButton";

/** One trip in My Trips: photo, place, dates, and the actions this trip allows right now. */
export function TripCard({ booking }: { booking: Booking }) {
  const { listing } = booking;
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-line sm:flex-row">
      <Link href={`/trips/${booking.id}`} className="shrink-0 sm:w-56">
        {listing.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote photos are served as-is
          <img src={sizedPhoto(listing.photo_url, 480)} alt="" className="aspect-[4/3] size-full object-cover sm:aspect-auto" />
        ) : (
          <div className="aspect-[4/3] bg-soft" />
        )}
      </Link>
      <div className="flex flex-1 flex-col justify-between gap-4 p-5">
        <div>
          <p className="text-sm text-muted">{listing.city}{listing.state ? `, ${listing.state}` : ""}</p>
          <h3 className="text-lg font-semibold leading-6">
            <Link href={`/trips/${booking.id}`} className="hover:underline">{listing.title}</Link>
          </h3>
          <p className="mt-1 text-sm">Hosted by {firstName(listing.host.name)}</p>
          <p className="mt-2 text-sm">
            <span className={booking.phase === "cancelled" ? "line-through" : "font-semibold"}>{formatRange(booking.check_in, booking.check_out)}</span>
            {" · "}{guestsLabel(booking)} · {formatINR(booking.total)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href={`/trips/${booking.id}`} className="rounded-lg border border-line px-4 py-2 text-sm font-semibold hover:border-ink">
            View reservation
          </Link>
          {booking.can_cancel && <CancelTripButton booking={booking} />}
          {booking.can_review && <ReviewButton booking={booking} />}
          {booking.has_review && (
            <span className="flex items-center gap-1.5 text-sm text-muted"><CheckCircle2 className="size-4 text-[#008a05]" /> Reviewed</span>
          )}
        </div>
      </div>
    </article>
  );
}
