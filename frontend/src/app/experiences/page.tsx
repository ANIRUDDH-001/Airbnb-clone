import { PartyPopper } from "lucide-react";
import type { Metadata } from "next";

import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = { title: "Experiences" };

export default function ExperiencesPage() {
  return <ComingSoon Icon={PartyPopper} title="Experiences" message="Cooking classes, heritage walks and backwater tours, hosted by locals." />;
}
