import type { Metadata, Viewport } from "next";
import { Nunito_Sans } from "next/font/google";
import { Toaster } from "sonner";

import { AuthProvider } from "@/components/auth/AuthProvider";
import { MobileNav } from "@/components/header/MobileNav";
import { SiteHeader } from "@/components/header/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { getViewer } from "@/lib/api/server";

import "./globals.css";

// Airbnb Cereal is proprietary; Nunito Sans is the closest free match (spec §7).
const nunito = Nunito_Sans({ subsets: ["latin"], variable: "--font-nunito", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Airbnb clone | Holiday rentals, cabins, beach houses & more", template: "%s · Airbnb clone" },
  description: "A full-stack Airbnb clone: search stays across India, book dates, manage trips, wishlists and listings.",
};

export const viewport: Viewport = { themeColor: "#ffffff" };

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const viewer = await getViewer();
  return (
    <html lang="en-IN" className={nunito.variable}>
      <body className="flex min-h-dvh flex-col font-sans">
        <AuthProvider initialUser={viewer}>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
          <MobileNav />
        </AuthProvider>
        <Toaster position="bottom-center" toastOptions={{ className: "!rounded-xl !font-sans" }} />
      </body>
    </html>
  );
}
