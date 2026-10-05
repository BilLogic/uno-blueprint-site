import { LayoutGrid, MessageCircle, Smartphone, Terminal } from "lucide-react";
import { touchPoints } from "@/content/touch-points";
import { ShowcaseSection } from "@/components/showcase/ShowcaseSection";

/** The places people and agents reach the same blueprint, one tab each. */
export function TouchPointsSection() {
  return (
    <ShowcaseSection
      head={{
        lead: touchPoints.headlineLead,
        headline: touchPoints.headline,
        subheadline: touchPoints.subheadline,
      }}
      idBase="tp"
      tabsLabel={touchPoints.tabsLabel}
      tabs={touchPoints.tabs}
      icons={{ app: LayoutGrid, agent: Terminal, chat: MessageCircle, phone: Smartphone }}
      phone="phone"
    />
  );
}
