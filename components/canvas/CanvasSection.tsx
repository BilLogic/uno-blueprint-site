import { GitCompareArrows, LayoutGrid, Presentation, SquarePen } from "lucide-react";
import { canvas } from "@/content/canvas";
import { ShowcaseSection } from "@/components/showcase/ShowcaseSection";
import { CheckMock, CompareMock, PresentMock, UnderstandMock } from "./mocks";

/** What a team does with the blueprint on the canvas, one tab per job. */
export function CanvasSection() {
  return (
    <ShowcaseSection
      head={{ headline: canvas.headline, subheadline: canvas.subheadline, more: canvas.more }}
      idBase="canvas"
      tabsLabel={canvas.tabsLabel}
      tabs={canvas.tabs}
      pictures={{
        understand: { Icon: LayoutGrid, picture: <UnderstandMock /> },
        check: { Icon: SquarePen, picture: <CheckMock /> },
        compare: { Icon: GitCompareArrows, picture: <CompareMock /> },
        present: { Icon: Presentation, picture: <PresentMock /> },
      }}
    />
  );
}
