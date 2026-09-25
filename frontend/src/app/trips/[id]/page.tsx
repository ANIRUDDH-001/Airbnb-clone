import { CheckCircle2, ChevronLeft, MapPin } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { LoginPrompt } from "@/components/auth/LoginPrompt";
import { CancelTripButton } from "@/components/trips/CancelTripButton";
import { ReviewButton } from "@/components/trips/ReviewButton";
import { Avatar } from "@/components/ui/Avatar";
import { getViewer, serverGetOrNull } from "@/lib/api/server";
import type { Booking } from "@/lib/api/types";
import { firstName, formatINR, formatLongDate, guestsLabel, plural, sizedPhoto } from "@/lib/format";

export const metadata: Metadata = { title: "Reservation" };

/** A readable confirmation code derived from the booking id (the live site shows codes like HMABC12345). */
const confirmationCode = (id: number) => `HM${String(id * 7919).padStart(8, "0")}`;

export default async function TripPage(props: PageProps<"/trips/[id]">) {
  const viewer = await getViewer();
  if (!viewer) return <LoginPrompt title="Your reservation" message="Log in to see this reservation." />;

  const { id } = await props.params;
  if (!/^\d+$/.test(id)) notFound();
  const booking = await serverGetOrNull<Booking>(`/bookings/${id}`); // 404 for anyone but the guest and the host
  if (!booking) notFound();

  const { new: justBooked } = await props.searchParams;
  const asHost = viewer.id === booking.listing.host.id;
  const { listing } = booking;
  const other = asHost ? booking.guest : listing.host;

  return (
    <div className="mx-auto max-w-[1120px] px-6 pb-16 pt-8 md:px-10 md:pt-12">
      <Link href={asHost ? "/hosting" : "/trips"} className="mb-6 inline-flex items-center gap-1 text-sm font-semibold hover:underline">
        <ChevronLeft className="size-4" /> {asHost ? "Reservations" : "Trips"}
      </Link>

      {justBooked === "1" && booking.phase === "upcoming" && (
        <div role="status" className="mb-8 flex items-start gap-4 rounded-2xl bg-[#f0fdf4] p-6">
          <CheckCircle2 className="size-8 shrink-0 text-[#008a05]" />
          <div>
            <h1 className="text-[22px] font-semibold">You&apos;re going to {listing.city}!</h1>
            <p className="mt-1">Your reservation is confirmed. {firstName(listing.host.name)} has been notified (in this demo, nobody is).</p>
          </div>
        </div>
      )}

      <div className="grid gap-12 md:grid-cols-[minmax(0,1fr)_minmax(0,400px)]">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element -- remote photos are served as-is */}
          {listing.photo_url && <img src={sizedPhoto(listing.photo_url, 1200)} alt="" className="aspect-[16/9] w-full rounded-2xl object-cover" />}
          <h2 className="mt-6 text-[26px] font-semibold leading-8">
            <Link href={`/rooms/${listing.id}`} className="hover:underline">{listing.title}</Link>
          </h2>
          <p className="mt-1 flex items-center gap-1 text-muted"><MapPin className="size-4" /> {listing.city}{listing.state ? `, ${listing.state}` : ""}, {listing.country}</p>

          <dl className="mt-8 grid grid-cols-2 divide-x divide-line rounded-2xl border border-line">
            <div className="p-5">
              <dt className="text-sm font-semibold">Check-in</dt>
              <dd>{formatLongDate(booking.check_in)}</dd>
              <dd className="text-sm text-muted">After 2:00 pm</dd>
            </div>
            <div className="p-5">
              <dt className="text-sm font-semibold">Checkout</dt>
              <dd>{formatLongDate(booking.check_out)}</dd>
              <dd className="text-sm text-muted">Before 11:00 am</dd>
            </div>
          </dl>

          <section className="mt-8 space-y-4 border-b border-line pb-8">
            <Detail label="Who's coming" value={guestsLabel(booking)} />
            <Detail label="Confirmation code" value={confirmationCode(booking.id)} />
            <Detail label="Status" value={
              booking.phase === "cancelled" ? "Cancelled" : booking.phase === "past" ? "Completed" : "Confirmed"
            } />
          </section>

          <section className="flex items-center gap-4 border-b border-line py-8">
            <Avatar name={other.name} src={other.avatar_url} size={56} />
            <div>
              <p className="font-semibold">{asHost ? `Guest: ${other.name}` : `Your host, ${firstName(other.name)}`}</p>
              <p className="text-sm text-muted">{asHost ? "Booked through this demo" : "Messaging is not part of this demo"}</p>
            </div>
          </section>

          <div className="flex flex-wrap gap-3 pt-8">
            {booking.can_cancel && <CancelTripButton booking={booking} asHost={asHost} />}
            {booking.can_review && <ReviewButton booking={booking} />}
            {booking.has_review && <span className="flex items-center gap-1.5 text-sm text-muted"><CheckCircle2 className="size-4 text-[#008a05]" /> Reviewed</span>}
            <Link href={`/rooms/${listing.id}`} className="rounded-lg border border-line px-4 py-2 text-sm font-semibold hover:border-ink">
              Show listing
            </Link>
          </div>
        </div>

        <aside>
          <div className="rounded-2xl border border-line p-6">
            <h2 className="text-[22px] font-semibold">{booking.phase === "cancelled" ? "Refunded" : asHost ? "Guest paid" : "Payment details"}</h2>
            <dl className="mt-4 space-y-3">
              <Line label={`${formatINR(booking.nightly_price)} x ${plural(booking.nights, "night")}`} value={booking.subtotal} />
              {booking.cleaning_fee > 0 && <Line label="Cleaning fee" value={booking.cleaning_fee} />}
              <Line label="Airbnb service fee" value={booking.service_fee} />
              <Line label="Taxes" value={booking.taxes} />
            </dl>
            <div className="mt-6 flex justify-between border-t border-line pt-6 font-semibold">
              <span>Total (INR)</span>
              <span className={booking.phase === "cancelled" ? "line-through" : ""}>{formatINR(booking.total)}</span>
            </div>
            <p className="mt-4 text-xs text-muted">
              Prices are locked when you book: later price changes by the host don&apos;t affect this reservation.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-semibold">{label}</p>
      <p className="text-muted">{value}</p>
    </div>
  );
}

function Line({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between">
      <dt>{label}</dt>
      <dd>{formatINR(value)}</dd>
    </div>
  );
}
