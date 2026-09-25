import { ChevronLeft, CreditCard, Star } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { LoginPrompt } from "@/components/auth/LoginPrompt";
import { ConfirmButton } from "@/components/booking/ConfirmButton";
import { TripEditor } from "@/components/booking/TripEditor";
import { ApiError } from "@/lib/api/core";
import { getViewer, serverGet, serverGetOrNull } from "@/lib/api/server";
import type { Availability, ListingDetail, PriceQuote } from "@/lib/api/types";
import { formatINR, formatLongDate, formatRating, PROPERTY_LABELS, plural, ROOM_LABELS, sizedPhoto } from "@/lib/format";
import { parseSearch, stayQuery } from "@/lib/search";

export const metadata: Metadata = { title: "Confirm and pay" };

export default async function BookPage(props: PageProps<"/book/[id]">) {
  const { id } = await props.params;
  if (!/^\d+$/.test(id)) notFound();
  const [listing, viewer] = await Promise.all([serverGetOrNull<ListingDetail>(`/listings/${id}`), getViewer()]);
  if (!listing) notFound();

  if (!viewer) {
    return <LoginPrompt title="Log in to book" message="You need an account to reserve this place. Use a demo account — it takes one click." />;
  }

  const stay = parseSearch("anywhere", await props.searchParams);
  const guests = { adults: Math.max(1, stay.adults), children: stay.children, infants: stay.infants };
  const backToListing = `/rooms/${listing.id}${stayQuery({ ...stay, ...guests })}`;

  if (!stay.checkIn || !stay.checkOut) {
    return <Problem message="Choose your dates on the listing page first." href={backToListing} />;
  }
  if (viewer.id === listing.host.id) {
    return <Problem message="You can't book your own listing." href={`/rooms/${listing.id}`} />;
  }

  const availability = await serverGet<Availability>(`/listings/${id}/availability`);
  let quote: PriceQuote | null = null;
  let problem: string | null = null;
  try {
    quote = await serverGet<PriceQuote>(`/listings/${id}/quote`, { check_in: stay.checkIn, check_out: stay.checkOut, ...guests });
  } catch (error) {
    if (!(error instanceof ApiError) || (error.status !== 409 && error.status !== 422)) throw error;
    problem = error.message; // dates taken, in the past, too many guests…
  }

  const kind = listing.room_type === "entire_home" ? PROPERTY_LABELS[listing.property_type] : ROOM_LABELS[listing.room_type];

  return (
    <div className="mx-auto max-w-[1120px] px-6 pb-16 pt-8 md:px-10 md:pt-16">
      <div className="mb-8 flex items-center gap-4 md:-ml-14">
        <Link href={backToListing} aria-label="Back to the listing" className="grid size-10 place-items-center rounded-full hover:bg-soft">
          <ChevronLeft className="size-5" />
        </Link>
        <h1 className="text-[26px] font-semibold md:text-[32px]">Confirm and pay</h1>
      </div>

      <div className="grid gap-12 md:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:gap-20">
        <div className="space-y-8">
          <TripEditor
            listingId={listing.id}
            checkIn={stay.checkIn}
            checkOut={stay.checkOut}
            guests={guests}
            maxGuests={listing.max_guests}
            bookedRanges={availability.booked}
            today={availability.start}
          />

          <section className="border-b border-line pb-8">
            <h2 className="mb-4 text-[22px] font-semibold">Pay with</h2>
            <div className="flex items-center gap-4 rounded-xl border border-line p-4">
              <CreditCard className="size-8 shrink-0" strokeWidth={1.4} />
              <div>
                <p className="font-semibold">Demo payment</p>
                <p className="text-sm text-muted">Payments are mocked in this clone — no card is needed and nothing is charged.</p>
              </div>
            </div>
          </section>

          <section className="border-b border-line pb-8">
            <h2 className="mb-2 text-[22px] font-semibold">Cancellation policy</h2>
            <p>
              <span className="font-semibold">Free cancellation before {formatLongDate(stay.checkIn)}.</span>{" "}
              After check-in, the stay can&apos;t be cancelled.
            </p>
          </section>

          <section className="border-b border-line pb-8">
            <h2 className="mb-2 text-[22px] font-semibold">Ground rules</h2>
            <p>We ask every guest to remember a few simple things about what makes a great guest.</p>
            <ul className="mt-3 list-disc space-y-1 pl-6">
              <li>Follow the house rules</li>
              <li>Treat your Host&apos;s home like your own</li>
            </ul>
          </section>

          {quote ? (
            <div>
              <p className="mb-6 text-xs text-muted">
                By selecting the button below, I agree to the Host&apos;s house rules and understand this is a demo booking.
              </p>
              <ConfirmButton
                total={formatINR(quote.total)}
                booking={{ listing_id: listing.id, check_in: stay.checkIn, check_out: stay.checkOut, ...guests }}
              />
            </div>
          ) : (
            <div role="alert" className="rounded-xl border border-brand/40 bg-brand/5 p-5">
              <p className="font-semibold">This stay can&apos;t be booked</p>
              <p className="mt-1">{problem}</p>
              <p className="mt-2 text-sm text-muted">Use Edit above to pick other dates or guests.</p>
            </div>
          )}
        </div>

        <aside>
          <div className="sticky top-[calc(var(--header-h,80px)+32px)] rounded-xl border border-line p-6">
            <div className="flex gap-4 border-b border-line pb-6">
              {/* eslint-disable-next-line @next/next/no-img-element -- remote photos are served as-is */}
              <img src={sizedPhoto(listing.photos[0], 360)} alt="" className="size-28 shrink-0 rounded-lg object-cover" />
              <div className="min-w-0 text-sm">
                <p className="text-xs text-muted">{kind} in {listing.city}</p>
                <p className="mt-0.5 line-clamp-2 font-semibold">{listing.title}</p>
                {listing.rating_avg !== null && (
                  <p className="mt-2 flex items-center gap-1 text-xs">
                    <Star className="size-3 fill-ink" /> {formatRating(listing.rating_avg)} ({plural(listing.review_count, "review")})
                    {listing.host.is_superhost && <> · Superhost</>}
                  </p>
                )}
              </div>
            </div>

            {quote && (
              <>
                <h2 className="pt-6 text-[22px] font-semibold">Price details</h2>
                <dl className="mt-4 space-y-3">
                  <PriceLine label={`${formatINR(quote.nightly_price)} x ${plural(quote.nights, "night")}`} value={quote.subtotal} />
                  {quote.cleaning_fee > 0 && <PriceLine label="Cleaning fee" value={quote.cleaning_fee} />}
                  <PriceLine label="Airbnb service fee" value={quote.service_fee} />
                  <PriceLine label="Taxes" value={quote.taxes} />
                </dl>
                <div className="mt-6 flex justify-between border-t border-line pt-6 font-semibold">
                  <span>Total (INR)</span>
                  <span>{formatINR(quote.total)}</span>
                </div>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function PriceLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between">
      <dt>{label}</dt>
      <dd>{formatINR(value)}</dd>
    </div>
  );
}

function Problem({ message, href }: { message: string; href: string }) {
  return (
    <div className="mx-auto max-w-md px-6 py-24 text-center">
      <h1 className="text-[26px] font-semibold">Let&apos;s try that again</h1>
      <p className="mt-3 text-muted">{message}</p>
      <Link href={href} className="mt-8 inline-block rounded-lg border border-ink px-6 py-3 font-semibold hover:bg-soft">
        Back to the listing
      </Link>
    </div>
  );
}
