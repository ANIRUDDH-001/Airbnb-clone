"use client";

import { useAuth } from "./AuthProvider";

/** For pages that need an account: a short explanation and a button that opens the login modal. */
export function LoginPrompt({ title, message }: { title: string; message: string }) {
  const { openLogin } = useAuth();
  return (
    <div className="mx-auto max-w-md px-6 py-24 text-center">
      <h1 className="text-[32px] font-semibold leading-9">{title}</h1>
      <p className="mt-3 text-muted">{message}</p>
      <button type="button" onClick={() => openLogin()}
              className="bg-brand-gradient mt-8 h-12 rounded-lg px-8 font-semibold text-white">
        Log in
      </button>
    </div>
  );
}
