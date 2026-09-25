"use client";

import { format, parseISO } from "date-fns";
import { CircleCheck, KeyRound, Map, MessageSquare, SprayCan, Star, Tag } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Avatar } from "@/components/ui/Avatar";
import { Modal } from "@/components/ui/Modal";
import { api, ApiError } from "@/lib/api/client";
import type { Page, RatingBreakdown, Review } from "@/lib/api/types";
import { formatRating, plural } from "@/lib/format";

const CATEGORIES: { key: keyof RatingBreakdown; label: string; Icon: typeof Star }[] = [
  { key: "cleanliness", label: "Cleanliness", Icon: SprayCan },
  { key: "accuracy", label: "Accuracy", Icon: CircleCheck },
  { key: "check_in", label: "Check-in", Icon: KeyRound },
  { key: "communication", label: "Communication", Icon: MessageSquare },
  { key: "location", label: "Location", Icon: Map },
  { key: "value", label: "Value", Icon: Tag },
];

interface ReviewsSectionProps {
  listingId: number;
  rating: number | null;
  count: number;
  guestFavourite: boolean;
  breakdown: RatingBreakdown | null;
  initial: Page<Review>;
}

export function ReviewsSection({ listingId, rating, count, guestFavourite, breakdown, initial }: ReviewsSectionProps) {
  const [open, setOpen] = useState(false);
  const [pages, setPages] = useState([initial]);
  const [loading, setLoading] = useState(false);
  const all = pages.flatMap((page) => page.items);
  const last = pages[pages.length - 1];

  async function loadMore() {
    setLoading(true);
    try {
      const next = await api.get<Page<Review>>(`/listings/${listingId}/reviews`, { page: last.page + 1, page_size: 10 });
      setPages((current) => [...current, next]);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't load more reviews");
    } finally {
      setLoading(false);
    }
  }

  if (!count || rating === null) {
    return (
      <section id="reviews" className="border-b border-line py-12">
        <h2 className="flex items-center gap-2 text-[22px] font-semibold"><Star className="size-5 fill-ink" /> No reviews (yet)</h2>
        <p className="mt-2 text-muted">This place is new. Be one of the first guests to stay and leave a review.</p>
      </section>
    );
  }

  return (
    <section id="reviews" className="scroll-mt-32 border-b border-line py-12">
      {guestFavourite ? (
        <div className="mb-10 text-center">
          <p className="flex items-center justify-center gap-3 text-[64px] font-semibold leading-none">
            <Laurel /> {formatRating(rating)} <Laurel flip />
          </p>
          <h2 className="mt-3 text-[22px] font-semibold">Guest favourite</h2>
          <p className="mx-auto mt-1 max-w-sm text-muted">One of the most loved homes on Airbnb, according to guests</p>
        </div>
      ) : (
        <h2 className="mb-8 flex items-center gap-2 text-[22px] font-semibold">
          <Star className="size-5 fill-ink" /> {formatRating(rating)} · {plural(count, "review")}
        </h2>
      )}

      {breakdown && (
        <dl className="mb-10 grid grid-cols-2 gap-y-6 sm:grid-cols-3 lg:grid-cols-6 lg:divide-x lg:divide-line">
          {CATEGORIES.map(({ key, label, Icon }) => (
            <div key={key} className="flex flex-col gap-1 lg:px-6 lg:first:pl-0">
              <dt className="text-sm font-semibold">{label}</dt>
              <dd className="text-lg font-semibold">{breakdown[key].toFixed(1)}</dd>
              <Icon className="mt-4 size-8" strokeWidth={1.3} aria-hidden />
            </div>
          ))}
        </dl>
      )}

      <ul className="grid gap-x-24 gap-y-10 md:grid-cols-2">
        {initial.items.slice(0, 6).map((review) => (
          <li key={review.id}><ReviewCard review={review} clamp /></li>
        ))}
      </ul>

      {count > 6 && (
        <button type="button" onClick={() => setOpen(true)} className="mt-10 rounded-lg border border-ink px-6 py-3 font-semibold hover:bg-soft">
          Show all {count} reviews
        </button>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={`${formatRating(rating)} · ${plural(count, "review")}`} size="lg">
        <ul className="space-y-10">
          {all.map((review) => (
            <li key={review.id}><ReviewCard review={review} /></li>
          ))}
        </ul>
        {last.has_more && (
          <button type="button" onClick={loadMore} disabled={loading}
                  className="mt-10 rounded-lg border border-ink px-6 py-3 font-semibold hover:bg-soft disabled:opacity-50">
            {loading ? "Loading…" : "Show more reviews"}
          </button>
        )}
      </Modal>
    </section>
  );
}

function ReviewCard({ review, clamp = false }: { review: Review; clamp?: boolean }) {
  return (
    <article>
      <header className="flex items-center gap-3">
        <Avatar name={review.author_name} src={review.author_avatar_url} size={48} />
        <div>
          <h3 className="font-semibold">{review.author_name}</h3>
          <p className="text-sm text-muted">{format(parseISO(review.created_at), "MMMM yyyy")}</p>
        </div>
      </header>
      <p className="mt-3 flex items-center gap-0.5" aria-label={`Rated ${review.rating} out of 5`}>
        {Array.from({ length: 5 }, (_, i) => (
          <Star key={i} className={i < review.rating ? "size-2.5 fill-ink text-ink" : "size-2.5 fill-line text-line"} aria-hidden />
        ))}
      </p>
      <p className={clamp ? "mt-2 line-clamp-3 leading-6" : "mt-2 leading-6"}>{review.comment}</p>
    </article>
  );
}

function Laurel({ flip = false }: { flip?: boolean }) {
  return (
    <svg viewBox="0 0 20 32" className="h-16 w-10" style={flip ? { transform: "scaleX(-1)" } : undefined} aria-hidden fill="currentColor">
      <path d="M15.4 30.6c-4.7-2.2-8.5-6-10.6-10.7-.2-.5-.8-.7-1.3-.5-.5.2-.7.8-.5 1.3 2.3 5.1 6.4 9.2 11.5 11.5.5.2 1.1 0 1.3-.5.3-.4.1-.9-.4-1.1ZM3.3 15.2c-.9-2.6-.6-5.4.8-7.7.3-.5.1-1.1-.4-1.4-.5-.3-1.1-.1-1.4.4-1.7 2.8-2 6.2-1 9.3.2.5.8.8 1.3.6.6-.1.8-.7.7-1.2Zm4.1 7.1c-2.6-.7-4.7-2.6-5.7-5.1-.2-.5-.8-.8-1.3-.6-.5.2-.8.8-.6 1.3 1.2 3.1 3.8 5.4 7 6.3.5.1 1.1-.2 1.2-.7.2-.6-.1-1.1-.6-1.2Zm-1.9-8.7c-.3-2.7.8-5.3 2.9-7 .4-.3.5-1 .1-1.4-.3-.4-1-.5-1.4-.1-2.6 2.1-3.9 5.3-3.6 8.6.1.6.6 1 1.1.9.6-.1 1-.5.9-1Zm4.9 13.2c-2.5-1.3-4.3-3.6-4.8-6.4-.1-.5-.6-.9-1.2-.8-.5.1-.9.6-.8 1.2.7 3.3 2.8 6.1 5.8 7.6.5.3 1.1.1 1.3-.4.3-.5.1-1-.3-1.2ZM9.2 5.8c-1.1 2.5-3.6 4.2-6.3 4.3-.6 0-1 .5-1 1s.5 1 1 1c3.5-.1 6.6-2.2 8.1-5.5.2-.5 0-1.1-.5-1.3-.5-.2-1.1 0-1.3.5Z" />
    </svg>
  );
}
