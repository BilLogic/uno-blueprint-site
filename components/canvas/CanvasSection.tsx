import { LayoutGrid, Presentation, SquarePen } from "lucide-react";
import type { ReactNode } from "react";
import { canvas, type CanvasTab } from "@/content/canvas";
import { Showcase } from "@/components/showcase/Showcase";
import { Container } from "@/components/ui/Container";
import { SectionHead } from "@/components/ui/SectionHead";
import { CheckMock, PresentMock, UnderstandMock } from "./mocks";

const pictures: Record<CanvasTab, { icon: ReactNode; picture: ReactNode }> = {
  understand: { icon: <LayoutGrid className="size-4" aria-hidden />, picture: <UnderstandMock /> },
  check: { icon: <SquarePen className="size-4" aria-hidden />, picture: <CheckMock /> },
  present: { icon: <Presentation className="size-4" aria-hidden />, picture: <PresentMock /> },
};

/** What a team does with the blueprint on the canvas, one tab per job. */
export function CanvasSection() {
  return (
    <section className="py-section">
      <Container>
        <SectionHead
          headline={canvas.headline}
          subheadline={canvas.subheadline}
          more={canvas.more}
          className="mb-8"
        />
        <Showcase
          idBase="canvas"
          label={canvas.tabsLabel}
          items={canvas.tabs.map((tab) => ({ ...tab, ...pictures[tab.value] }))}
        />
      </Container>
    </section>
  );
}
