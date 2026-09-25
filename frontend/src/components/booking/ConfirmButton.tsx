"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { api, ApiError } from "@/lib/api/client";
import type { Booking, BookingCreate } from "@/lib/api/types";

/** Mocked payment: confirming creates the booking. The server re-validates and re-prices everything. */
export function ConfirmButton({ booking, total }: { booking: BookingCreate; total: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    setProblem(null);
    try {
      const created = await api.post<Booking>("/bookings", booking);
      toast.success("Reservation confirmed");
      router.push(`/trips/${created.id}?new=1`);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Couldn't confirm the booking. Please try again.";
      setProblem(message);
      toast.error(message);
      setBusy(false);
      router.refresh(); // someone may have taken the dates: re-check availability and price
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={confirm}
        disabled={busy}
        className="bg-brand-gradient h-14 w-full rounded-lg text-base font-semibold text-white disabled:opacity-60 md:w-auto md:px-10"
      >
        {busy ? "Confirming…" : `Confirm and pay · ${total}`}
      </button>
      {problem && <p role="alert" className="mt-3 text-sm text-brand-dark">{problem}</p>}
    </div>
  );
}
