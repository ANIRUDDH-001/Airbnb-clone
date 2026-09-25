import { CalendarDays, Heart, House, Settings } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { LoginPrompt } from "@/components/auth/LoginPrompt";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { Avatar } from "@/components/ui/Avatar";
import { getViewer } from "@/lib/api/server";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const viewer = await getViewer();
  if (!viewer) return <LoginPrompt title="Account" message="Log in to see your profile, trips and listings." />;

  const links = [
    { href: "/trips", label: "Trips", text: "Upcoming and past stays", Icon: CalendarDays },
    { href: "/wishlists", label: "Wishlists", text: "Places you've saved", Icon: Heart },
    { href: viewer.is_host ? "/hosting" : "/hosting/listings/new", label: viewer.is_host ? "Hosting" : "Become a host", text: viewer.is_host ? "Reservations and listings" : "List your place in a few steps", Icon: House },
  ];

  return (
    <div className="mx-auto max-w-[1120px] px-6 pb-16 pt-8 md:px-10 md:pt-12">
      <h1 className="text-[32px] font-semibold">Account</h1>
      <div className="mt-6 flex items-center gap-5 rounded-2xl p-6 shadow-float sm:max-w-md">
        <Avatar name={viewer.name} src={viewer.avatar_url} size={80} />
        <div>
          <p className="text-[22px] font-semibold">{viewer.name}</p>
          <p className="text-muted">{viewer.email}</p>
          {viewer.is_superhost && <p className="mt-1 text-sm font-semibold">Superhost</p>}
        </div>
      </div>

      <ul className="mt-10 grid gap-4 sm:grid-cols-3">
        {links.map(({ href, label, text, Icon }) => (
          <li key={href}>
            <Link href={href} className="block h-full rounded-2xl p-6 shadow-card transition hover:shadow-float">
              <Icon className="size-8" strokeWidth={1.4} />
              <p className="mt-6 font-semibold">{label}</p>
              <p className="text-sm text-muted">{text}</p>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-10 flex items-center gap-3 text-sm text-muted">
        <Settings className="size-4" /> Personal info, security and payments are coming soon — this is a demo account.
      </div>
      <div className="mt-8"><LogoutButton /></div>
    </div>
  );
}
