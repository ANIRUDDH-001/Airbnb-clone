"use client";

import clsx from "clsx";
import { Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Modal } from "@/components/ui/Modal";
import { api, ApiError } from "@/lib/api/client";
import type { Booking, ReviewCreate } from "@/lib/api/types";
import { firstName } from "@/lib/format";

type Scores = Omit<ReviewCreate, "comment">;

const CATEGORIES: { key: keyof Scores; label: string; hint: string }[] = [
  { key: "cleanliness", label: "Cleanliness", hint: "Was the place clean and tidy?" },
  { key: "accuracy", label: "Accuracy", hint: "Did it match the listing?" },
  { key: "check_in", label: "Check-in", hint: "Was arriving easy?" },
  { key: "communication", label: "Communication", hint: "Did the host respond quickly?" },
  { key: "location", label: "Location", hint: "Did you like the area?" },
  { key: "value", label: "Value", hint: "Was it worth the price?" },
];

const MIN_COMMENT = 10; // backend ReviewCreate.comment min_length
const MAX_COMMENT = 2000;

export function ReviewButton({ booking, className }: { booking: Booking; className?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [scores, setScores] = useState<Partial<Scores>>({});
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);

  const complete = (["rating", ...CATEGORIES.map((c) => c.key)] as (keyof Scores)[]).every((key) => scores[key]);
  const trimmed = comment.trim();

  async function submit() {
    if (!complete) return setError("Please rate your overall stay and every category.");
    if (trimmed.length < MIN_COMMENT) return setError(`Tell other guests a little more (at least ${MIN_COMMENT} characters).`);
    setBusy(true);
    setError(null);
    try {
      await api.post(`/bookings/${booking.id}/review`, { ...(scores as Scores), comment: trimmed });
      toast.success("Thanks! Your review is published.");
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't publish your review. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
              className={clsx("rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-black", className)}>
        Write a review
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Write a review"
        size="md"
        footer={
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted">{trimmed.length}/{MAX_COMMENT}</p>
            <button type="button" onClick={submit} disabled={busy}
                    className="bg-brand-gradient rounded-lg px-6 py-3 font-semibold text-white disabled:opacity-50">
              {busy ? "Publishing…" : "Publish review"}
            </button>
          </div>
        }
      >
        <h3 className="text-[22px] font-semibold">How was your stay at {firstName(booking.listing.host.name)}&apos;s place?</h3>
        <p className="mt-1 text-muted">{booking.listing.title}</p>

        <div className="mt-6 flex items-center justify-between border-b border-line pb-6">
          <span className="font-semibold">Overall</span>
          <Stars value={scores.rating} onChange={(rating) => setScores((current) => ({ ...current, rating }))} label="Overall" size="lg" />
        </div>

        <ul className="divide-y divide-line">
          {CATEGORIES.map(({ key, label, hint }) => (
            <li key={key} className="flex items-center justify-between gap-4 py-4">
              <span>
                <span className="block font-semibold">{label}</span>
                <span className="text-sm text-muted">{hint}</span>
              </span>
              <Stars value={scores[key]} onChange={(value) => setScores((current) => ({ ...current, [key]: value }))} label={label} />
            </li>
          ))}
        </ul>

        <label className="mt-4 block">
          <span className="font-semibold">Your review</span>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value.slice(0, MAX_COMMENT))}
            rows={5}
            placeholder="What did you love? What could be better?"
            className="mt-2 w-full rounded-lg border border-[#b0b0b0] p-3 outline-none focus:border-ink focus:ring-1 focus:ring-ink"
          />
        </label>
        {error && <p role="alert" className="mt-2 text-sm text-brand-dark">{error}</p>}
      </Modal>
    </>
  );
}

function Stars({ value, onChange, label, size = "md" }: { value?: number; onChange: (value: number) => void; label: string; size?: "md" | "lg" }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value || 0;
  return (
    <div role="radiogroup" aria-label={`${label} rating`} className="flex shrink-0" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
          onMouseEnter={() => setHover(n)}
          onClick={() => onChange(n)}
          className="p-0.5"
        >
          <Star className={clsx(size === "lg" ? "size-7" : "size-5", n <= shown ? "fill-ink text-ink" : "text-[#b0b0b0]")} strokeWidth={1.5} />
        </button>
      ))}
    </div>
  );
}
