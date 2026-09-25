"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { Avatar } from "@/components/ui/Avatar";

type Item = { label: string; href?: string; onSelect?: () => void; bold?: boolean } | "divider";

export function UserMenu() {
  const { user, openLogin, logout } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const items: Item[] = user
    ? [
        { label: "Wishlists", href: "/wishlists", bold: true },
        { label: "Trips", href: "/trips", bold: true },
        { label: "Messages", href: "/messages", bold: true },
        { label: "Profile", href: "/account", bold: true },
        "divider",
        { label: user.is_host ? "Manage listings" : "Become a host", href: user.is_host ? "/hosting/listings" : "/hosting/listings/new" },
        { label: "Account", href: "/account" },
        "divider",
        { label: "Log out", onSelect: () => void logout() },
      ]
    : [
        { label: "Log in or sign up", onSelect: () => openLogin(), bold: true },
        "divider",
        { label: "Become a host", onSelect: () => openLogin() },
        { label: "Help Centre", href: "/account" },
      ];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Main navigation menu"
        className="flex h-12 items-center gap-3 rounded-full border border-line py-1 pl-3.5 pr-1.5 transition hover:shadow-card"
      >
        <Menu className="size-4" strokeWidth={2.5} />
        <Avatar name={user?.name ?? "Guest"} src={user?.avatar_url ?? null} size={32}
                className={user ? "" : "!bg-muted"} />
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-14 z-50 w-60 overflow-hidden rounded-xl bg-white py-2 shadow-float">
          {items.map((item, index) =>
            item === "divider" ? (
              <div key={`d${index}`} className="my-2 h-px bg-line" />
            ) : item.href ? (
              <Link key={item.label} href={item.href} role="menuitem"
                    className={`block px-4 py-3 text-sm hover:bg-soft ${item.bold ? "font-semibold" : ""}`}>
                {item.label}
              </Link>
            ) : (
              <button key={item.label} type="button" role="menuitem"
                      onClick={() => { setOpen(false); item.onSelect?.(); }}
                      className={`block w-full px-4 py-3 text-left text-sm hover:bg-soft ${item.bold ? "font-semibold" : ""}`}>
                {item.label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}
