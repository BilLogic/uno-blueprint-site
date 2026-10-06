"use client";

import { structure } from "@/content/structure";
import { usePointerLight } from "@/hooks/use-pointer-light";
import { useWalkthrough } from "@/hooks/use-walkthrough";
import { sceneAt, stepEdges } from "@/lib/walkthrough";
import { Caption } from "./Caption";
import { StructureScene } from "./StructureScene";
import s from "./Walkthrough.module.css";

const LENGTHS = structure.steps.map((step) => step.scroll);
const EDGES = stepEdges(LENGTHS);
const SCROLL_LENGTH = LENGTHS.reduce((sum, length) => sum + length, 0);

/**
 * A team's scattered context, then services down to one cell, driven by
 * scroll. Six cards (a PRD, a thread, a design, a ticket, a funnel, a diff)
 * become the stack; sheets for services, phases, scenarios and paths stack
 * and leave; the blueprint turns to face the reader; its lanes and lines are
 * read one at a time, then its steps; and one cell lights, then is projected
 * into its panel. The headline stays pinned with the frame, and the caption
 * changes with each step.
 */
export function Walkthrough() {
  const { refs, step, previous, open, layout } = useWalkthrough(EDGES, SCROLL_LENGTH);
  const { scroller, sticky, head, stage, world, caption } = refs;
  const scene = sceneAt(step, previous, layout.lift, open);
  const frame = usePointerLight<HTMLDivElement>();

  const shown = structure.steps[step]!;
  const stageClass = [
    s.stage,
    scene.intro && s.intro,
    layout.narrow && s.narrow,
    scene.flat && s.flat,
    scene.named && s.named,
    scene.steps && s.columnsOn,
    scene.cell && s.cellPicked,
    scene.open && s.open,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={scroller} data-pin className={s.scroller}>
      <div ref={sticky} data-pin-frame className={s.sticky}>
        <div
          ref={head}
          className="mb-7 flex items-end justify-between gap-6 max-md:mb-4.5 max-md:flex-col max-md:items-start max-md:gap-3.5"
        >
          <div className="grid gap-4">
            <h2 className="max-w-heading text-title text-balance">
              <span className="block text-muted">{structure.heading.lead}</span>{" "}
              {structure.heading.main}
            </h2>
            <p className="max-w-lead text-pretty text-muted">{structure.sub}</p>
          </div>
        </div>
        <div ref={frame} className={s.frame}>
          <div className="relative min-w-0 flex-1 overflow-hidden rounded-16-inset bg-card">
            <div ref={stage} className={stageClass} aria-hidden>
              <div ref={world} className={s.world}>
                <StructureScene scene={scene} />
              </div>
            </div>
            <div ref={caption} className={s.caption}>
              <Caption steps={structure.steps} step={step} previous={previous} />
              <div className="sr-only" aria-live="polite">
                <b>{shown.title}</b> <p>{shown.caption}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
