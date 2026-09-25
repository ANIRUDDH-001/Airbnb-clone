"use client";

import { useAuth } from "./AuthProvider";

export function LogoutButton() {
  const { logout } = useAuth();
  return (
    <button type="button" onClick={() => void logout()} className="rounded-lg border border-ink px-6 py-3 font-semibold hover:bg-soft">
      Log out
    </button>
  );
}
