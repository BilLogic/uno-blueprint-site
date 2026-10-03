"use client";

import { useRef } from "react";
import { structure } from "@/content/structure";
import { usePointerGlow } from "@/hooks/use-pointer-glow";
import { useWalkthrough } from "@/hooks/use-walkthrough";
import { sceneAt, stepEdges } from "@/lib/walkthrough";
import { StructureScene } from "./StructureScene";
import s from "./Walkthrough.module.css";

const LENGTHS = structure.steps.map((step) => step.scroll);
const EDGES = stepEdges(LENGTHS);
const SCROLL_LENGTH = LENGTHS.reduce((sum, length) => sum + length, 0);

/**
 * Services down to one cell, driven by scroll: sheets for services, phases,
 * scenarios and paths stack and leave, the blueprint turns to face the
 * reader, its lanes and lines are read one at a time, then its steps, its
 * cells, and one cell projected into its panel. The headline stays pinned
 * with the frame, and the caption changes with each step.
 */
export function Walkthrough() {
  const { refs, step, previous } = useWalkthrough(EDGES, SCROLL_LENGTH);
  const { scroller, sticky, head, stage, world, caption } = refs;
  const scene = sceneAt(step, previous);
  const frame = useRef<HTMLDivElement>(null);
  usePointerGlow(frame);

  const shown = structure.steps[step]!;
  const stageClass = [
    s.stage,
    scene.flat && s.flat,
    scene.named && s.named,
    scene.steps && s.columnsOn,
    scene.cell && s.cellPicked,
    scene.open && s.open,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={scroller} className={s.scroller}>
      <div ref={sticky} className={s.sticky}>
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
            <div ref={caption} className={s.caption} aria-live="polite">
              <b key={`title-${step}`}>{shown.title}</b>
              <p key={`caption-${step}`}>{shown.caption}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
