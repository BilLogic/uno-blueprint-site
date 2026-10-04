"use client";

import { memo } from "react";
import markDark from "@/public/images/uno-mark-dark.png";
import markLight from "@/public/images/uno-mark-light.png";
import { hero, type HeroTool } from "@/content/hero";
import { WALKERS } from "@/lib/hero-picture";
import { useHeroPicture } from "@/hooks/use-hero-picture";
import { usePointerLight } from "@/hooks/use-pointer-light";
import { HeroBoard } from "./HeroBoard";
import { HeroPanel } from "./HeroPanel";
import { Glyph } from "./Glyph";
import { ToolIcon } from "./ToolIcon";

const { picture } = hero;
// The mark is always square, and keeps its size when the row is tight, as in the prototype.
const markClass = "block size-11 max-w-none min-w-0 flex-none aspect-square object-contain rounded-mark max-md:size-9";

/**
 * Tools feed one node, the node lays documents out on a blueprint (one of a
 * stack), people and agents move across its cells, and the cell a person stops
 * on is projected into the panel beside it. One image to assistive technology.
 */
export function HeroPicture() {
  const {
    board,
    beams,
    stageRef,
    feedRef,
    toBoardRef,
    toolRef,
    nodeRef,
    pingRef,
    lightRef,
    projectorRef,
    panelRef,
    statusRef,
    ownerRef,
    walkerRef,
    ...boardRefs
  } = useHeroPicture(picture.tools.length);
  const rim = usePointerLight<HTMLDivElement>();
  const beamPaths = beams ? [...beams.feeds, beams.toBoard] : [];

  return (
    <div ref={rim} role="img" aria-label={picture.label} className="relative mt-16 flex rounded-20 rim-light p-px">
      <div className="relative min-w-0 flex-1 overflow-hidden rounded-20-inset bg-card">
        <div
          ref={stageRef}
          className="relative grid grid-cols-(--hero-stage-columns) items-center justify-center gap-x-hero-gap px-hero-stage-x py-hero-stage-y max-md:grid-cols-1 max-md:justify-items-center max-md:gap-7.5 max-md:px-4 max-md:py-6.5"
        >
          <div className="pointer-events-none absolute inset-0 hero-dots" />
          <div className="pointer-events-none absolute top-1/2 left-1/2 h-130 w-180 -translate-1/2 hero-glow opacity-0 dark:opacity-100" />

          {/* No viewBox: one unit is one CSS pixel, so the beams stay put when the stage grows. */}
          <svg className="pointer-events-none absolute inset-0 size-full overflow-visible">
            {beamPaths.map((d, i) => (
              <path key={`base-${i}`} d={d} strokeWidth={1} className="fill-none stroke-line-2" />
            ))}
            {beams?.feeds.map((d, i) => (
              <path
                key={`feed-${i}`}
                ref={feedRef(i)}
                d={d}
                strokeWidth={1.6}
                strokeLinecap="round"
                className="fill-none stroke-brand opacity-0"
              />
            ))}
            {beams && (
              <path
                ref={toBoardRef}
                d={beams.toBoard}
                strokeWidth={1.6}
                strokeLinecap="round"
                className="fill-none stroke-brand opacity-0"
              />
            )}
          </svg>

          <div className="relative z-1 flex items-center justify-start gap-hero-gap max-md:flex-col max-md:gap-6.5">
            <div className="relative z-1 grid grid-cols-(--hero-tool-columns) gap-3 max-md:gap-1.75">
              {picture.tools.map((tool, i) => (
                <Tool key={tool.name} tool={tool} lit={board.lit.includes(i)} tileRef={toolRef(i)} />
              ))}
            </div>
            <div ref={nodeRef} title={picture.node} className="relative z-1 grid flex-none place-items-center rounded-mark">
              <img src={markLight.src} width={markLight.width} height={markLight.height} alt="" className={`${markClass} dark:hidden`} />
              <img src={markDark.src} width={markDark.width} height={markDark.height} alt="" className={`${markClass} hidden dark:block`} />
              <span ref={pingRef} className="pointer-events-none absolute inset-0 rounded-mark opacity-0" />
            </div>
          </div>

          <HeroBoard board={board} {...boardRefs} />
          <HeroPanel
            cell={board.shown ?? 0}
            sources={board.sources[board.shown ?? 0] ?? []}
            status={board.status}
            phase={board.panel}
            away={board.solo}
            panelRef={panelRef}
            statusRef={statusRef}
            ownerRef={ownerRef}
          />

          {/* A phone shows the board alone: no panel, so no light into it. */}
          <svg
            ref={lightRef}
            className="pointer-events-none absolute inset-0 z-2 size-full overflow-visible max-md:hidden"
          >
            <g ref={projectorRef} className="opacity-0 transition-opacity duration-250 data-on:opacity-100">
              <polygon className="fill-brand opacity-7" />
              <line strokeWidth={1} strokeDasharray="3 3" className="stroke-brand opacity-75" />
              <line strokeWidth={1} strokeDasharray="3 3" className="stroke-brand opacity-75" />
            </g>
          </svg>

          {/* People and agents walk the whole stage: cells, tools and the panel. */}
          {WALKERS.map((kind, i) => (
            <span
              key={i}
              ref={walkerRef(i)}
              className={`pointer-events-none absolute top-0 left-0 z-30 grid size-5.5 place-items-center opacity-0 shadow-walker transition-walk data-placed:opacity-100 motion-reduce:transition-none max-md:size-4 ${
                kind === "person" ? "rounded-full bg-ink text-bg" : "rounded-8 bg-brand text-on-primary max-md:rounded-6"
              }`}
            >
              <Glyph name={kind} className="size-3.25 max-md:size-2.5" />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

type ToolProps = { tool: HeroTool; lit: boolean; tileRef: (element: HTMLElement | null) => void };

/** A source tool; it lights while it sends a document. */
const Tool = memo(function Tool({ tool, lit, tileRef }: ToolProps) {
  return (
    <span
      ref={tileRef}
      title={tool.name}
      className={`grid size-10.5 place-items-center rounded-12 border bg-panel transition-[border-color,box-shadow] duration-300 max-md:size-7.5 max-md:rounded-8 ${lit ? "border-brand shadow-lit" : "border-line-2 shadow-card"}`}
    >
      <ToolIcon
        icon={tool.icon}
        markClassName={`size-5 transition-[fill,color] duration-300 max-md:size-3.5 ${lit ? "fill-ink text-ink" : "fill-muted text-muted"}`}
        lineClassName={`size-4.75 transition-[color] duration-300 max-md:size-3.5 ${lit ? "text-ink" : "text-muted"}`}
      />
    </span>
  );
});
