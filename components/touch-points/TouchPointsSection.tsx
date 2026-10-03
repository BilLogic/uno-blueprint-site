import { LayoutGrid, MessageCircle, Terminal } from "lucide-react";
import type { ReactNode } from "react";
import { touchPoints, type TouchPointTab } from "@/content/touch-points";
import { Showcase } from "@/components/showcase/Showcase";
import { Container } from "@/components/ui/Container";
import { SectionHead } from "@/components/ui/SectionHead";
import { AgentMock, AppMock, ChatMock } from "./mocks";

const pictures: Record<TouchPointTab, { icon: ReactNode; picture: ReactNode }> = {
  app: { icon: <LayoutGrid className="size-4" aria-hidden />, picture: <AppMock /> },
  agent: { icon: <Terminal className="size-4" aria-hidden />, picture: <AgentMock /> },
  chat: { icon: <MessageCircle className="size-4" aria-hidden />, picture: <ChatMock /> },
};

/** The places people and agents reach the same blueprint, one tab each. */
export function TouchPointsSection() {
  return (
    <section className="py-section">
      <Container>
        <SectionHead
          lead={touchPoints.headlineLead}
          headline={touchPoints.headline}
          subheadline={touchPoints.subheadline}
          className="mb-8"
        />
        <Showcase
          idBase="tp"
          label={touchPoints.tabsLabel}
          items={touchPoints.tabs.map((tab) => ({ ...tab, ...pictures[tab.value] }))}
        />
      </Container>
    </section>
  );
}
