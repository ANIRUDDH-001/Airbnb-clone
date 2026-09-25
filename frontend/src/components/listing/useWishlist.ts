"use client";

import { useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/components/auth/AuthProvider";
import { api, ApiError } from "@/lib/api/client";

/**
 * Saved state for one listing's heart. Optimistic: flips immediately, rolls back if the API call fails.
 * Logged-out visitors get the login modal, and the save completes after they log in.
 */
export function useWishlist(listingId: number, initiallySaved: boolean, onChange?: (saved: boolean) => void) {
  const { requireUser } = useAuth();
  const [saved, setSaved] = useState(initiallySaved);
  const [serverSaved, setServerSaved] = useState(initiallySaved);

  // A server refresh (e.g. after logging in) brings the real saved state: adopt it.
  if (initiallySaved !== serverSaved) {
    setServerSaved(initiallySaved);
    setSaved(initiallySaved);
  }

  async function write(next: boolean) {
    setSaved(next);
    onChange?.(next);
    try {
      if (next) await api.put(`/wishlist/${listingId}`);
      else await api.del(`/wishlist/${listingId}`);
      toast(next ? "Saved to your wishlist" : "Removed from your wishlist");
    } catch (error) {
      setSaved(!next);
      onChange?.(!next);
      toast.error(error instanceof ApiError ? error.message : "Couldn't update your wishlist");
    }
  }

  return {
    saved,
    // After a login the flow always means "save", whatever the stale local state says.
    toggle: () => requireUser(() => void write(!saved)),
  };
}
