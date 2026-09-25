"use client";

import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Modal } from "@/components/ui/Modal";
import { api, ApiError } from "@/lib/api/client";
import type { Booking } from "@/lib/api/types";
import { formatINR, formatRange } from "@/lib/format";

/** Cancel with a confirmation step. Works for the guest and for the host (the backend allows both). */
export function CancelTripButton({ booking, asHost = false, className }: { booking: Booking; asHost?: boolean; className?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function cancel() {
    setBusy(true);
    try {
      await api.post(`/bookings/${booking.id}/cancel`);
      toast.success(asHost ? "Reservation cancelled. The guest's dates are free again." : "Your reservation is cancelled");
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Couldn't cancel. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
              className={clsx("rounded-lg border border-ink px-4 py-2 text-sm font-semibold hover:bg-soft", className)}>
        Cancel {asHost ? "reservation" : "trip"}
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Cancel reservation"
        size="sm"
        footer={
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => setOpen(false)} className="font-semibold underline">Keep it</button>
            <button type="button" onClick={cancel} disabled={busy}
                    className="rounded-lg bg-ink px-5 py-3 font-semibold text-white disabled:opacity-50">
              {busy ? "Cancelling…" : "Cancel reservation"}
            </button>
          </div>
        }
      >
        <p className="font-semibold">{booking.listing.title}</p>
        <p className="text-muted">{formatRange(booking.check_in, booking.check_out)}</p>
        <p className="mt-4">
          {asHost
            ? `${booking.guest.name} will be refunded ${formatINR(booking.total)} in full and the dates open up for other guests.`
            : `You'll get a full refund of ${formatINR(booking.total)}. This can't be undone.`}
        </p>
      </Modal>
    </>
  );
}
