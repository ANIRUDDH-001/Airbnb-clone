"use client";

import { useRouter } from "next/navigation";
import { createContext, type ReactNode, useCallback, useContext, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { api } from "@/lib/api/client";
import type { User } from "@/lib/api/types";
import { firstName } from "@/lib/format";

import { LoginModal } from "./LoginModal";

interface AuthContextValue {
  user: User | null;
  /** Open the login modal; `then` runs after a successful login (e.g. finish saving a listing). */
  openLogin: (then?: () => void) => void;
  /** Run `action` now if logged in, otherwise after the visitor logs in. */
  requireUser: (action: () => void) => void;
  login: (email: string) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ initialUser, children }: { initialUser: User | null; children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState(initialUser);
  const [serverUser, setServerUser] = useState(initialUser);
  const [loginOpen, setLoginOpen] = useState(false);

  // router.refresh() re-renders the layout with fresh server data (e.g. is_host after a first listing): adopt it.
  if (initialUser !== serverUser) {
    setServerUser(initialUser);
    setUser(initialUser);
  }
  const pending = useRef<(() => void) | null>(null);

  const openLogin = useCallback((then?: () => void) => {
    pending.current = then ?? null;
    setLoginOpen(true);
  }, []);

  const login = useCallback(
    async (email: string) => {
      const loggedIn = await api.post<User>("/auth/login", { email });
      setUser(loggedIn);
      setLoginOpen(false);
      toast.success(`Welcome, ${firstName(loggedIn.name)}`);
      router.refresh(); // server components re-render with the new session cookie
      const next = pending.current;
      pending.current = null;
      next?.();
      return loggedIn;
    },
    [router],
  );

  const logout = useCallback(async () => {
    await api.post("/auth/logout");
    setUser(null);
    toast("You're logged out");
    router.push("/");
    router.refresh();
  }, [router]);

  const requireUser = useCallback(
    (action: () => void) => (user ? action() : openLogin(action)),
    [user, openLogin],
  );

  const value = useMemo(
    () => ({ user, openLogin, requireUser, login, logout }),
    [user, openLogin, requireUser, login, logout],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      <LoginModal
        open={loginOpen}
        onClose={() => {
          pending.current = null;
          setLoginOpen(false);
        }}
        onLogin={login}
      />
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}
