import { ClipboardList, Database, Layers, Link, Users } from "lucide-react";
import { bento } from "@/content/bento";
import { BentoGrid } from "./BentoGrid";
import { BentoPanel } from "./BentoPanel";
import { DuoPicture } from "./DuoPicture";
import { ContextPicture, RagPicture, ScalePicture, SourcesPicture } from "./Pictures";

const iconProps = { strokeWidth: 1.75, "aria-hidden": true } as const;

/**
 * What the structure gives you: five panels, each a picture that is grey at
 * rest and plays while its panel is hovered or focused, or, on a touch
 * screen, while it is in the middle of the screen.
 */
export function Bento() {
  return (
    <BentoGrid>
      <BentoPanel
        index={0}
        size="wide"
        icon={<Users {...iconProps} />}
        title={bento.duo.title}
        body={bento.duo.body}
      >
        <DuoPicture />
      </BentoPanel>
      <BentoPanel
        index={1}
        size="narrow"
        labelled
        icon={<Database {...iconProps} />}
        title={bento.rag.title}
        body={bento.rag.body}
      >
        <RagPicture />
      </BentoPanel>
      <BentoPanel
        index={2}
        icon={<Layers {...iconProps} />}
        title={bento.scale.title}
        body={bento.scale.body}
      >
        <ScalePicture />
      </BentoPanel>
      <BentoPanel
        index={3}
        icon={<ClipboardList {...iconProps} />}
        title={bento.context.title}
        body={bento.context.body}
      >
        <ContextPicture />
      </BentoPanel>
      <BentoPanel
        index={4}
        icon={<Link {...iconProps} />}
        title={bento.sources.title}
        body={bento.sources.body}
      >
        <SourcesPicture />
      </BentoPanel>
    </BentoGrid>
  );
}
