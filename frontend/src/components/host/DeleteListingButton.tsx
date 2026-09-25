"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Modal } from "@/components/ui/Modal";
import { api, ApiError } from "@/lib/api/client";
import { plural } from "@/lib/format";

interface DeleteListingButtonProps {
  listingId: number;
  title: string;
  upcoming: number;
}

/** Delete with confirmation. The backend refuses while guests are booked; that message is shown as-is. */
export function DeleteListingButton({ listingId, title, upcoming }: DeleteListingButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setProblem(null);
    try {
      await api.del(`/host/listings/${listingId}`);
      toast.success("Listing deleted");
      setOpen(false);
      router.refresh();
    } catch (error) {
      setProblem(error instanceof ApiError ? error.message : "Couldn't delete the listing. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" onClick={() => { setProblem(null); setOpen(true); }}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-brand-dark underline hover:bg-soft">
        Delete
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Delete listing"
        size="sm"
        footer={
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => setOpen(false)} className="font-semibold underline">Keep listing</button>
            <button type="button" onClick={remove} disabled={busy}
                    className="rounded-lg bg-[#c13515] px-5 py-3 font-semibold text-white disabled:opacity-50">
              {busy ? "Deleting…" : "Delete"}
            </button>
          </div>
        }
      >
        <p className="font-semibold">{title}</p>
        <p className="mt-2 text-muted">
          It disappears from search and wishlists. Past trips keep their record.
          {upcoming > 0 && ` It has ${plural(upcoming, "upcoming reservation")} — those must be cancelled first.`}
        </p>
        {problem && <p role="alert" className="mt-4 rounded-lg bg-brand/5 p-3 text-sm text-brand-dark">{problem}</p>}
      </Modal>
    </>
  );
}
