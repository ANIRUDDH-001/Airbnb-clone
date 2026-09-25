"use client";

import clsx from "clsx";
import { BellRing, Globe, House, PartyPopper } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { useAuth } from "@/components/auth/AuthProvider";
import { SearchBar } from "@/components/search/SearchBar";

import { Logo } from "./Logo";
import { UserMenu } from "./UserMenu";

const TRAVEL_TABS = [
  { href: "/", label: "Homes", Icon: House },
  { href: "/experiences", label: "Experiences", Icon: PartyPopper },
  { href: "/services", label: "Services", Icon: BellRing },
];

const HOST_TABS = [
  { href: "/hosting", label: "Today" },
  { href: "/hosting/listings", label: "Listings" },
];

/** Which header the route gets: the full one with tabs and the big search bar, a compact one, or the host one. */
function headerMode(pathname: string): "full" | "compact" | "host" {
  if (pathname.startsWith("/hosting")) return "host";
  if (pathname === "/" || pathname.startsWith("/s/")) return "full";
  return "compact";
}

export function SiteHeader() {
  const pathname = usePathname();
  const { user, openLogin } = useAuth();
  const mode = headerMode(pathname);
  const ref = useRef<HTMLElement>(null);

  // Publish the header's live height so sticky bars below it (category bar, filters) sit flush under it.
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      document.documentElement.style.setProperty("--header-h", `${Math.round(entry.borderBoxSize[0].blockSize)}px`);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const homesActive = pathname === "/" || pathname.startsWith("/s/") || pathname.startsWith("/rooms");

  const hostLink =
    mode === "host"
      ? { href: "/", label: "Switch to travelling" }
      : user?.is_host
        ? { href: "/hosting", label: "Switch to hosting" }
        : { href: "/hosting/listings/new", label: "Become a host" };

  return (
    <header ref={ref} className="sticky top-0 z-40 border-b border-line bg-white">
      <div className="mx-auto hidden max-w-[1880px] px-6 md:block lg:px-10 xl:px-20">
        <div className="grid h-20 grid-cols-[1fr_auto_1fr] items-center gap-4">
          <Logo href={mode === "host" ? "/hosting" : "/"} />

          <nav aria-label={mode === "host" ? "Hosting" : "Travel"} className="flex items-center justify-center gap-2">
            {mode === "host" &&
              HOST_TABS.map(({ href, label }) => (
                <TabLink key={href} href={href} active={pathname === href} label={label} />
              ))}
            {mode === "full" &&
              TRAVEL_TABS.map(({ href, label, Icon }) => (
                <TabLink key={href} href={href} active={href === "/" ? homesActive : pathname.startsWith(href)}
                         label={label} icon={<Icon className="size-7" strokeWidth={1.6} />} />
              ))}
            {mode === "compact" && <SearchBar variant="compact" />}
          </nav>

          <div className="flex items-center justify-end gap-1">
            <Link
              href={hostLink.href}
              onClick={(event) => {
                if (!user) {
                  event.preventDefault();
                  openLogin();
                }
              }}
              className="hidden whitespace-nowrap rounded-full px-4 py-3 text-sm font-semibold hover:bg-soft lg:block"
            >
              {hostLink.label}
            </Link>
            <button
              type="button"
              aria-label="Choose a language and currency"
              onClick={() => toast("English (IN) · ₹ INR — the only option in this demo")}
              className="grid size-12 place-items-center rounded-full hover:bg-soft"
            >
              <Globe className="size-[18px]" />
            </button>
            <UserMenu />
          </div>
        </div>

        {mode === "full" && (
          <div className="flex justify-center pb-6 pt-1">
            <SearchBar variant="expanded" />
          </div>
        )}
      </div>

      {/* Phones: a search pill; navigation lives in the bottom bar. */}
      <div className="px-6 py-3 md:hidden">
        <SearchBar variant="mobile" />
      </div>
    </header>
  );
}

function TabLink({ href, label, active, icon }: { href: string; label: string; active: boolean; icon?: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={clsx(
        "group flex items-center gap-2 px-3 py-2 text-[15px] transition",
        active ? "font-semibold text-ink" : "text-muted hover:text-ink",
      )}
    >
      {icon && <span className={clsx("transition group-hover:scale-110", active ? "text-ink" : "text-muted")}>{icon}</span>}
      <span className={clsx("border-b-2 pb-0.5", active ? "border-ink" : "border-transparent group-hover:border-line")}>
        {label}
      </span>
    </Link>
  );
}
