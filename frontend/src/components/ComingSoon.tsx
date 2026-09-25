import type { LucideIcon } from "lucide-react";
import Link from "next/link";

/** Placeholder for parts of the live site this clone deliberately leaves out (spec §7). */
export function ComingSoon({ Icon, title, message }: { Icon: LucideIcon; title: string; message: string }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 py-24 text-center">
      <span className="grid size-20 place-items-center rounded-full bg-soft">
        <Icon className="size-9" strokeWidth={1.4} />
      </span>
      <h1 className="mt-6 text-[32px] font-semibold leading-9">{title}</h1>
      <p className="mt-3 text-muted">{message}</p>
      <p className="mt-1 text-sm text-muted">Coming soon — not part of this demo.</p>
      <Link href="/" className="mt-8 rounded-lg bg-ink px-6 py-3 font-semibold text-white hover:bg-black">Explore homes</Link>
    </div>
  );
}
