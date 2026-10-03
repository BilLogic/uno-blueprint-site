import { Bot, UserRound } from "lucide-react";
import type { View } from "@/lib/view";

export function ViewIcon({ view }: { view: View }) {
  const Icon = view === "agent" ? Bot : UserRound;
  return <Icon aria-hidden strokeWidth={1.75} />;
}
