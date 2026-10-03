import { LayoutGrid, MessageCircle, Terminal } from "lucide-react";
import { touchPoints } from "@/content/touch-points";
import { ShowcaseSection } from "@/components/showcase/ShowcaseSection";
import { AgentMock, AppMock, ChatMock } from "./mocks";

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
      pictures={{
        app: { Icon: LayoutGrid, picture: <AppMock /> },
        agent: { Icon: Terminal, picture: <AgentMock /> },
        chat: { Icon: MessageCircle, picture: <ChatMock /> },
      }}
    />
  );
}
