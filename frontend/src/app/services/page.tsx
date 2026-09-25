import { BellRing } from "lucide-react";
import type { Metadata } from "next";

import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = { title: "Services" };

export default function ServicesPage() {
  return <ComingSoon Icon={BellRing} title="Services" message="Private chefs, massages and photographers, booked for your stay." />;
}
