"use client";

import { Home, Luggage } from "lucide-react";
import { type FormEvent, useState } from "react";

import { Modal } from "@/components/ui/Modal";
import { ApiError } from "@/lib/api/client";
import type { User } from "@/lib/api/types";

// Seeded demo accounts (backend/app/seed/data.py). Auth is mocked: there are no passwords.
const DEMO_ACCOUNTS = [
  { email: "ananya@example.com", label: "Continue as demo guest", hint: "Ananya · has trips and a wishlist", Icon: Luggage },
  { email: "rahul@example.com", label: "Continue as demo host", hint: "Rahul · Superhost with 8 listings", Icon: Home },
];

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
  onLogin: (email: string) => Promise<User>;
}

export function LoginModal({ open, onClose, onLogin }: LoginModalProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function logInAs(address: string) {
    setBusy(address);
    setError(null);
    try {
      await onLogin(address);
      setEmail("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't log in. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (email.trim()) void logInAs(email.trim());
  }

  return (
    <Modal open={open} onClose={onClose} title="Log in or sign up">
      <h3 className="mb-6 text-[22px] font-semibold">Welcome to Airbnb</h3>

      <form onSubmit={submit} noValidate>
        <label className="block rounded-lg border border-[#b0b0b0] px-3 py-2 focus-within:border-ink focus-within:ring-1 focus-within:ring-ink">
          <span className="block text-xs text-muted">Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            placeholder="ananya@example.com"
            className="w-full bg-transparent text-base outline-none"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "login-error" : undefined}
          />
        </label>
        {error && (
          <p id="login-error" role="alert" className="mt-2 text-sm text-brand-dark">
            {error}
          </p>
        )}
        <p className="mt-2 text-xs text-muted">
          This is a demo: log in with any seeded account&apos;s email. No password needed.
        </p>
        <button
          type="submit"
          disabled={!email.trim() || busy !== null}
          className="bg-brand-gradient mt-4 h-12 w-full rounded-lg font-semibold text-white disabled:opacity-40"
        >
          {busy === email.trim() ? "Logging in…" : "Continue"}
        </button>
      </form>

      <div className="my-6 flex items-center gap-4 text-xs text-muted" aria-hidden>
        <span className="h-px flex-1 bg-line" />
        or
        <span className="h-px flex-1 bg-line" />
      </div>

      <div className="space-y-3">
        {DEMO_ACCOUNTS.map(({ email: demo, label, hint, Icon }) => (
          <button
            key={demo}
            type="button"
            onClick={() => logInAs(demo)}
            disabled={busy !== null}
            className="flex h-14 w-full items-center gap-4 rounded-lg border border-ink px-5 text-left transition hover:bg-soft disabled:opacity-50"
          >
            <Icon className="size-5 shrink-0" />
            <span className="flex-1">
              <span className="block text-sm font-semibold">{busy === demo ? "Logging in…" : label}</span>
              <span className="block text-xs text-muted">{hint}</span>
            </span>
          </button>
        ))}
      </div>
    </Modal>
  );
}
