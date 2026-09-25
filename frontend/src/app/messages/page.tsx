import { MessageSquare } from "lucide-react";
import type { Metadata } from "next";

import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = { title: "Messages" };

export default function MessagesPage() {
  return <ComingSoon Icon={MessageSquare} title="Messages" message="Chat with hosts and guests about a stay." />;
}
