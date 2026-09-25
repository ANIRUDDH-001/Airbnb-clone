"use client";

import { useEffect } from "react";

/**
 * Shown when a page can't load its data. The usual cause in the hosted demo is the free backend waking up
 * (Render spins it down when idle; the first request can take up to a minute), so "Try again" usually works.
 */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg px-6 py-24 text-center">
      <h1 className="text-[26px] font-semibold">Something went wrong</h1>
      <p className="mt-3 text-muted">
        We couldn&apos;t load this page. If the demo has been idle, its server takes up to a minute to wake up.
      </p>
      <button type="button" onClick={reset} className="bg-brand-gradient mt-8 h-12 rounded-lg px-8 font-semibold text-white">
        Try again
      </button>
    </div>
  );
}
