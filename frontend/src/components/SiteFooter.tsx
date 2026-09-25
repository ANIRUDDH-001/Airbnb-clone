import { Globe } from "lucide-react";
import Link from "next/link";

const COLUMNS = [
  { title: "Support", links: ["Help Centre", "Get help with a safety issue", "Anti-discrimination", "Cancellation options"] },
  { title: "Hosting", links: ["Airbnb your home", "Hosting resources", "Community forum", "Hosting responsibly"] },
  { title: "Airbnb", links: ["Newsroom", "Careers", "Investors", "Gift cards"] },
];

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line bg-soft pb-20 md:pb-0">
      <div className="mx-auto max-w-[1880px] px-6 lg:px-10 xl:px-20">
        <div className="grid gap-8 border-b border-line py-12 md:grid-cols-3">
          {COLUMNS.map((column) => (
            <div key={column.title}>
              <h3 className="mb-3 text-sm font-semibold">{column.title}</h3>
              <ul className="space-y-3 text-sm">
                {column.links.map((link) => (
                  <li key={link}>
                    <Link href="/account" className="hover:underline">{link}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex flex-col-reverse gap-4 py-6 text-sm md:flex-row md:items-center md:justify-between">
          <p>
            © {new Date().getFullYear()} Airbnb clone · A demo built for Scalar AI Lab · Not affiliated with Airbnb, Inc.
          </p>
          <p className="flex items-center gap-4 font-semibold">
            <span className="flex items-center gap-2"><Globe className="size-4" /> English (IN)</span>
            <span>₹ INR</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
