"use client";

import { useEffect, useRef, useState } from "react";
import { lanes, map, skill } from "@/content/harness";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useSteps } from "@/hooks/use-steps";
import { mapColumns, mapFrame, mapLinks, mapSteps } from "@/lib/harness-map";
import { Card, Flow, Side, Skill } from "./Flow";
import { laneColour } from "./MiniBoard";
import { SourceLogo } from "./SourceLogo";
import type { PictureProps } from "./pictures";

const STEPS = mapSteps(map.readOrder);
const TIMES = STEPS.map((step) => step.at);
const STEP_COUNT = 3;
const { command } = skill("map");

/** A grey stand-in for words that are not the point. */
const bar = "block h-1 flex-none rounded-2 bg-line-2";

/**
 * The map: phrases are picked out of five documents and placed on a blueprint
 * that starts empty. A lane or a step exists only once a phrase calls for it,
 * and a step found later opens up between its neighbours.
 */
export function MapPicture({ running, onStale, onDone }: PictureProps) {
  // Stacked below the lg breakpoint, as the flow's max-lg: classes are.
  const stacked = useMediaQuery("(max-width: 900px)");
  const flow = useRef<HTMLDivElement>(null);
  const skill = useRef<HTMLSpanElement>(null);
  const phrases = useRef<(HTMLElement | null)[]>([]);
  const rows = useRef<(HTMLDivElement | null)[]>([]);
  const [lines, setLines] = useState<{ size: string; paths: [string, string][] }>({ size: "0 0 0 0", paths: [] });

  // Side by side, each read draws a line through the skill. Every rectangle is
  // read at that moment, so scrolling midway cannot skew it.
  const count = useSteps(TIMES, running, (i) => {
    const step = STEPS[i];
    if (step?.kind !== "read" || stacked) return;
    const frame = flow.current?.getBoundingClientRect();
    const phrase = phrases.current[step.phrase];
    const doc = phrase?.closest("[data-doc]");
    const lane = map.placements[step.phrase]?.lane;
    const row = lane === undefined ? null : rows.current[lane];
    if (!frame?.width || !skill.current || !phrase || !doc || !row) return;
    const paths = mapLinks({
      frame,
      skill: skill.current.getBoundingClientRect(),
      phrase: phrase.getBoundingClientRect(),
      doc: doc.getBoundingClientRect(),
      lane: row.getBoundingClientRect(),
    });
    setLines((drawn) => ({ size: `0 0 ${frame.width} ${frame.height}`, paths: [...drawn.paths, paths] }));
  }, onDone);

  // A resize moves everything the lines join, so the picture starts again.
  const hasLines = lines.paths.length > 0;
  useEffect(() => {
    if (!hasLines) return;
    let timer = 0;
    const onResize = () => {
      clearTimeout(timer);
      timer = window.setTimeout(onStale, 200);
    };
    window.addEventListener("resize", onResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", onResize);
    };
  }, [hasLines, onStale]);

  const frame = mapFrame(STEPS, count, map.placements, stacked, lanes.length, STEP_COUNT);
  const columns = { gridTemplateColumns: `6em ${mapColumns(frame.steps)}` };
  const row = "grid gap-x-0 gap-y-1.5 rounded-8 transition-[grid-template-columns] duration-650 ease-[cubic-bezier(.3,.8,.2,1)] motion-reduce:transition-none";
  const opens = (open: boolean) =>
    `block min-w-0 overflow-hidden transition-opacity delay-200 duration-450 motion-reduce:transition-none ${open ? "opacity-100" : "opacity-0"}`;

  return (
    <Flow ref={flow} className="grid-cols-[minmax(0,.9fr)_auto_minmax(0,1.2fr)] gap-16">
      <svg
        viewBox={lines.size}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-1 size-full overflow-visible max-lg:hidden"
      >
        {lines.paths.map(([into, out], i) => (
          <g key={i} className="fill-none stroke-brand stroke-[1.4] opacity-90 [stroke-dasharray:1] [stroke-dashoffset:1]">
            <path pathLength={1} d={into} className="animate-draw" />
            <path pathLength={1} d={out} className="animate-draw [animation-delay:.4s]" />
          </g>
        ))}
      </svg>

      <Side label={map.sources}>
        {map.docs.map((doc) => (
          <div
            key={doc.source}
            data-doc
            className="grid gap-[.7em] rounded-10 border border-line-2 bg-panel px-[.9em] py-[.8em] max-lg:flex max-lg:items-center max-lg:gap-[.6em] max-lg:px-[.7em] max-lg:py-[.45em]"
          >
            <div className="flex items-center gap-[.6em] max-lg:flex-none">
              <SourceLogo source={doc.source} />
              <span className={`${bar} max-lg:hidden`} style={{ width: `${doc.title}%` }} />
            </div>
            <p className="flex flex-nowrap items-center gap-[.45em] max-lg:flex-wrap max-lg:gap-[.4em]">
              {doc.line.map((part, p) =>
                "bar" in part ? (
                  <span key={p} className={`${bar} max-lg:hidden`} style={{ width: `${part.bar}%` }} />
                ) : (
                  <mark
                    key={p}
                    ref={(node) => {
                      phrases.current[part.phrase] = node;
                    }}
                    className={`rounded-6 px-[.45em] py-[.15em] text-[.95em] whitespace-nowrap transition-[background-color,color,box-shadow] duration-400 motion-reduce:transition-none ${
                      frame.read.has(part.phrase)
                        ? "bg-brand-soft text-ink shadow-[0_0_0_1px_var(--color-brand)]"
                        : "bg-transparent text-muted shadow-[0_0_0_1px_var(--color-line-2)]"
                    }`}
                  >
                    {part.text}
                  </mark>
                ),
              )}
            </p>
          </div>
        ))}
      </Side>

      <Skill command={command} pings={frame.pings} raised nameRef={skill} />

      <Side label={map.result}>
        <Card>
          <div className="grid gap-1.5">
            <div className={`${row} mb-0.5 items-center`} style={columns}>
              <span />
              {frame.steps.map((open, s) => (
                <span key={s} className={opens(open)}>
                  <i className={`${bar} ml-1.5 w-[55%]`} />
                </span>
              ))}
            </div>
            {lanes.map((lane, l) => (
              <div
                key={lane.id}
                ref={(node) => {
                  rows.current[l] = node;
                }}
                style={{ ...laneColour(lane.id), ...columns }}
                className={`${row} items-stretch ${frame.lanes[l] ? "opacity-100" : "opacity-0"}`}
              >
                <em className="flex items-center gap-[.5em] text-[max(11px,.86em)] font-medium whitespace-nowrap text-muted not-italic before:size-[.62em] before:flex-none before:rounded-[.2em] before:bg-(--la) before:content-['']">
                  {lane.name}
                </em>
                {frame.steps.map((open, s) => {
                  const phrase = map.placements.findIndex((p) => p.lane === l && p.step === s);
                  const placed = phrase >= 0 && frame.placed.has(phrase);
                  const look =
                    phrase >= 0 && phrase === frame.latest
                      ? "border-dashed border-brand bg-brand-soft"
                      : placed
                        ? "border-transparent bg-card-2"
                        : "border-line";
                  return (
                    <span key={s} className={opens(open)}>
                      <span
                        className={`ml-1.5 grid min-h-[3.6em] content-center rounded-8 border px-[.55em] py-[.45em] text-[max(11px,.86em)] leading-[1.2] hyphens-auto transition-[background-color,border-color] duration-t-2 motion-reduce:transition-none ${look}`}
                      >
                        {placed ? map.placements[phrase]?.text : null}
                      </span>
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
        </Card>
      </Side>
    </Flow>
  );
}
