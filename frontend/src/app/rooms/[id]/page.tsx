import { differenceInYears, parseISO } from "date-fns";
import { CalendarX2, KeyRound, Laptop, Medal, Star } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AmenitiesSection } from "@/components/listing/detail/AmenitiesSection";
import { AvailabilitySection } from "@/components/listing/detail/AvailabilitySection";
import { Description } from "@/components/listing/detail/Description";
import { ListingMap } from "@/components/listing/detail/ListingMap";
import { MobileReserveBar } from "@/components/listing/detail/MobileReserveBar";
import { PhotoMosaic } from "@/components/listing/detail/PhotoMosaic";
import { ReserveCard } from "@/components/listing/detail/ReserveCard";
import { ReviewsSection } from "@/components/listing/detail/ReviewsSection";
import { StayProvider } from "@/components/listing/detail/StayProvider";
import { TitleActions } from "@/components/listing/detail/TitleActions";
import { Avatar } from "@/components/ui/Avatar";
import { getViewer, serverGet, serverGetOrNull } from "@/lib/api/server";
import type { Availability, ListingDetail, Page, Review } from "@/lib/api/types";
import { firstName, formatRating, PROPERTY_LABELS, plural, ROOM_LABELS } from "@/lib/format";
import { parseSearch } from "@/lib/search";

async function loadListing(id: string) {
  return /^\d+$/.test(id) ? serverGetOrNull<ListingDetail>(`/listings/${id}`) : null;
}

export async function generateMetadata(props: PageProps<"/rooms/[id]">): Promise<Metadata> {
  const listing = await loadListing((await props.params).id);
  return listing ? { title: `${listing.title} · ${listing.city}`, description: listing.description.slice(0, 160) } : {};
}

export default async function ListingPage(props: PageProps<"/rooms/[id]">) {
  const { id } = await props.params;
  const [listing, viewer] = await Promise.all([loadListing(id), getViewer()]);
  if (!listing) notFound();

  const [availability, reviews] = await Promise.all([
    serverGet<Availability>(`/listings/${id}/availability`),
    serverGet<Page<Review>>(`/listings/${id}/reviews`, { page_size: 6 }),
  ]);
  const today = availability.start; // the backend's "today" (IST), so both sides agree on what's in the past
  const requested = parseSearch("anywhere", await props.searchParams);
  const host = listing.host;
  const yearsHosting = Math.max(1, differenceInYears(parseISO(today), parseISO(host.hosting_since)));
  const place = [listing.city, listing.state, listing.country].filter(Boolean).join(", ");
  const kind = listing.room_type === "entire_home" ? `Entire ${PROPERTY_LABELS[listing.property_type].toLowerCase()}` : ROOM_LABELS[listing.room_type];

  return (
    <StayProvider
      listing={{ id: listing.id, maxGuests: listing.max_guests, nightlyPrice: listing.nightly_price, city: listing.city, isOwnListing: viewer?.id === host.id }}
      bookedRanges={availability.booked}
      today={today}
      initial={{ checkIn: requested.checkIn, checkOut: requested.checkOut, adults: requested.adults, children: requested.children, infants: requested.infants }}
    >
      <div className="mx-auto max-w-[1280px] px-6 pb-24 pt-6 md:px-10 md:pb-0 xl:px-20">
        <div className="mb-6 hidden items-end justify-between gap-6 md:flex">
          <h1 className="text-[26px] font-semibold leading-8">{listing.title}</h1>
          <TitleActions listingId={listing.id} saved={listing.is_wishlisted} />
        </div>

        <PhotoMosaic photos={listing.photos} title={listing.title} />

        <div className="grid gap-12 md:grid-cols-[minmax(0,1fr)_minmax(0,340px)] lg:grid-cols-[minmax(0,1fr)_372px] lg:gap-24">
          <div>
            <section className="border-b border-line pb-8 pt-6 md:pt-8">
              <h1 className="mb-4 text-[26px] font-semibold leading-8 md:hidden">{listing.title}</h1>
              <h2 className="text-[22px] font-semibold">{kind} in {place}</h2>
              <p className="mt-1 text-muted">
                {[plural(listing.max_guests, "guest"), plural(listing.bedrooms, "bedroom"), plural(listing.beds, "bed"),
                  plural(listing.bathrooms, "bathroom")].join(" · ")}
              </p>
              {listing.is_guest_favourite && listing.rating_avg !== null ? (
                <a href="#reviews" className="mt-6 flex items-center gap-4 rounded-xl border border-line px-6 py-4 hover:bg-soft">
                  <span className="text-center text-lg font-semibold leading-5">Guest<br />favourite</span>
                  <span className="hidden flex-1 font-semibold sm:block">One of the most loved homes on Airbnb, according to guests</span>
                  <span className="text-center">
                    <span className="block text-lg font-semibold">{formatRating(listing.rating_avg)}</span>
                    <span className="flex gap-0.5">{Array.from({ length: 5 }, (_, i) => <Star key={i} className="size-2.5 fill-ink" aria-hidden />)}</span>
                  </span>
                  <span className="border-l border-line pl-4 text-center">
                    <span className="block text-lg font-semibold">{listing.review_count}</span>
                    <span className="text-xs underline">Reviews</span>
                  </span>
                </a>
              ) : listing.rating_avg !== null ? (
                <a href="#reviews" className="mt-2 inline-flex items-center gap-1 font-semibold">
                  <Star className="size-3.5 fill-ink" /> {formatRating(listing.rating_avg)} · <span className="underline">{plural(listing.review_count, "review")}</span>
                </a>
              ) : null}
            </section>

            <section className="flex items-center gap-4 border-b border-line py-6">
              <div className="relative">
                <Avatar name={host.name} src={host.avatar_url} size={40} />
                {host.is_superhost && <Medal className="absolute -bottom-1 -right-1 size-4 rounded-full bg-white fill-brand text-white" aria-hidden />}
              </div>
              <div>
                <p className="font-semibold">Hosted by {firstName(host.name)}</p>
                <p className="text-sm text-muted">
                  {host.is_superhost ? "Superhost · " : ""}{plural(yearsHosting, "year")} hosting
                </p>
              </div>
            </section>

            <Highlights listing={listing} />
            <Description text={listing.description} />
            <AmenitiesSection amenities={listing.amenities} />
            <AvailabilitySection />
          </div>

          <aside className="hidden md:block">
            <div className="sticky top-[calc(var(--header-h,80px)+48px)] pt-8">
              <ReserveCard />
            </div>
          </aside>
        </div>

        <ReviewsSection
          listingId={listing.id}
          rating={listing.rating_avg}
          count={listing.review_count}
          guestFavourite={listing.is_guest_favourite}
          breakdown={listing.rating_breakdown}
          initial={reviews}
        />

        <section className="border-b border-line py-12">
          <h2 className="mb-6 text-[22px] font-semibold">Where you&apos;ll be</h2>
          <ListingMap latitude={listing.latitude} longitude={listing.longitude} label={place} />
          <p className="mt-6 font-semibold">{place}</p>
          <p className="mt-1 text-sm text-muted">Exact location provided after booking.</p>
        </section>

        <section className="border-b border-line py-12">
          <h2 className="mb-6 text-[22px] font-semibold">Meet your host</h2>
          <div className="grid gap-10 md:grid-cols-[380px_1fr]">
            <div className="grid grid-cols-[1fr_auto] items-center gap-6 rounded-3xl bg-white p-8 shadow-float">
              <div className="text-center">
                <div className="relative mx-auto w-fit">
                  <Avatar name={host.name} src={host.avatar_url} size={104} />
                  {host.is_superhost && <Medal className="absolute bottom-0 right-0 size-8 rounded-full bg-brand p-1.5 text-white" aria-hidden />}
                </div>
                <p className="mt-3 text-[28px] font-bold leading-8">{firstName(host.name)}</p>
                {host.is_superhost && <p className="text-sm font-semibold">Superhost</p>}
              </div>
              <dl className="divide-y divide-line text-left">
                <Stat value={String(host.review_count)} label="Reviews" />
                <Stat value={host.rating_avg !== null ? `${formatRating(host.rating_avg)}★` : "New"} label="Rating" />
                <Stat value={String(yearsHosting)} label={yearsHosting === 1 ? "Year hosting" : "Years hosting"} />
              </dl>
            </div>
            <div>
              {host.is_superhost && (
                <>
                  <h3 className="text-lg font-semibold">{firstName(host.name)} is a Superhost</h3>
                  <p className="mb-6 mt-2 text-muted">Superhosts are experienced, highly rated hosts who are committed to providing great stays for guests.</p>
                </>
              )}
              {host.bio && <p className="leading-6">{host.bio}</p>}
              <p className="mt-6 text-sm text-muted">Hosting {plural(host.listing_count, "place")} on this demo.</p>
            </div>
          </div>
        </section>

        <section className="py-12">
          <h2 className="mb-6 text-[22px] font-semibold">Things to know</h2>
          <div className="grid gap-8 text-[15px] md:grid-cols-3">
            <div>
              <h3 className="mb-2 font-semibold">House rules</h3>
              <p>Check-in after 2:00 pm</p><p>Checkout before 11:00 am</p><p>{plural(listing.max_guests, "guest")} maximum</p>
            </div>
            <div>
              <h3 className="mb-2 font-semibold">Safety & property</h3>
              <p>{listing.amenities.some((a) => a.code === "smoke_alarm") ? "Smoke alarm" : "No smoke alarm listed"}</p>
              <p>{listing.amenities.some((a) => a.code === "first_aid_kit") ? "First aid kit" : "No first aid kit listed"}</p>
            </div>
            <div>
              <h3 className="mb-2 font-semibold">Cancellation policy</h3>
              <p>Free cancellation any time before check-in. Stays that have started can&apos;t be cancelled.</p>
            </div>
          </div>
        </section>
      </div>

      <MobileReserveBar />
    </StayProvider>
  );
}

function Highlights({ listing }: { listing: ListingDetail }) {
  const has = (code: string) => listing.amenities.some((a) => a.code === code);
  const items = [
    has("self_check_in") && { Icon: KeyRound, title: "Self check-in", text: "Check yourself in with the keypad." },
    listing.host.is_superhost && { Icon: Medal, title: `${firstName(listing.host.name)} is a Superhost`, text: "Superhosts are experienced, highly rated hosts." },
    has("dedicated_workspace") && { Icon: Laptop, title: "Dedicated workspace", text: "A room with wifi that's well suited for working." },
    { Icon: CalendarX2, title: "Free cancellation before check-in", text: "Cancel any upcoming stay before it starts." },
  ].filter((item) => item !== false).slice(0, 3);

  return (
    <section className="space-y-6 border-b border-line py-8">
      {items.map(({ Icon, title, text }) => (
        <div key={title} className="flex gap-6">
          <Icon className="mt-1 size-6 shrink-0" strokeWidth={1.5} aria-hidden />
          <div>
            <h3 className="font-semibold">{title}</h3>
            <p className="text-sm text-muted">{text}</p>
          </div>
        </div>
      ))}
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col-reverse py-2.5">
      <dt className="text-[10px] font-semibold">{label}</dt>
      <dd className="text-[22px] font-bold leading-6">{value}</dd>
    </div>
  );
}
