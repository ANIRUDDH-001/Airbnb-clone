"use client";

import clsx from "clsx";
import { Heart, Search, UserCircle2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAuth } from "@/components/auth/AuthProvider";

/** Phone-only bottom tab bar, as in the live mobile site. */
export function MobileNav() {
  const pathname = usePathname();
  const { user, openLogin } = useAuth();

  const tabs = [
    { href: "/", label: "Explore", Icon: Search, active: pathname === "/" || pathname.startsWith("/s/") },
    { href: "/wishlists", label: "Wishlists", Icon: Heart, active: pathname.startsWith("/wishlists") },
    user
      ? { href: "/trips", label: "Trips", Icon: AirbnbTrips, active: pathname.startsWith("/trips") }
      : null,
    { href: user ? "/account" : "#login", label: user ? "Profile" : "Log in", Icon: UserCircle2, active: pathname === "/account" },
  ].filter((tab) => tab !== null);

  return (
    <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
      <ul className="flex justify-center gap-6">
        {tabs.map(({ href, label, Icon, active }) => (
          <li key={label}>
            <Link
              href={href}
              onClick={(event) => {
                if (href === "#login" || (!user && href === "/wishlists")) {
                  event.preventDefault();
                  openLogin();
                }
              }}
              className={clsx("flex w-16 flex-col items-center gap-1 py-2.5 text-[10px] font-semibold", active ? "text-brand" : "text-muted")}
            >
              <Icon className="size-6" strokeWidth={active ? 2.2 : 1.6} />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function AirbnbTrips(props: React.SVGProps<SVGSVGElement> & { strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 20V9.5L12 4l8 5.5V20" />
      <path d="M9 20v-6h6v6" />
    </svg>
  );
}
