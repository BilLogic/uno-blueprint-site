"use client";

import { Presentation, SearchCheck } from "lucide-react";
import { useCallback, useEffect, useReducer, useRef, useState, type ComponentType, type ReactNode } from "react";
import { harness, skill as skillOf, type SkillId } from "@/content/harness";
import { entryCaptionDelay } from "@/components/showcase/stage-motion";
import showcase from "@/components/showcase/Showcase.module.css";
import { TabList, tabId, tabPanelId } from "@/components/ui/Tabs";
import { WordCaption } from "@/components/ui/WordCaption";
import { useInView } from "@/hooks/use-in-view";
import { useLayerMotion } from "@/hooks/use-layer-motion";
import { useReducedMotion } from "@/hooks/use-media-query";
import { useStageEntry } from "@/hooks/use-stage-entry";
import { useStageGlide } from "@/hooks/use-stage-glide";
import { HARNESS_HOLD, HARNESS_LOOP_START, harnessLoop } from "@/lib/harness-loop";
import { AuditPicture } from "./AuditPicture";
import { MapPicture } from "./MapPicture";
import type { PictureProps } from "./pictures";
import { BranchIcon, FilePlusIcon } from "./SkillIcons";
import { SlicePicture } from "./SlicePicture";
import { WhatIfPicture } from "./WhatIfPicture";

const ID_BASE = "harness";
const CAPTION_ID = "harness-caption";
const icon = { className: "size-4", strokeWidth: 1.75 } as const;

const pictures: Record<SkillId, ComponentType<PictureProps>> = {
  map: MapPicture,
  slice: SlicePicture,
  audit: AuditPicture,
  whatif: WhatIfPicture,
};

const tabs = harness.skills.map((skill) => ({
  value: skill.id,
  label: skill.label,
  icon: {
    map: <FilePlusIcon />,
    slice: <Presentation {...icon} />,
    audit: <SearchCheck {...icon} />,
    whatif: <BranchIcon />,
  }[skill.id],
}));

const captions = harness.skills.map((skill) => ({ title: `${skill.label}.`, caption: skill.caption }));

/** The picture showing inside the stage, while the entry looks for it. */
const SHOWING = "[data-picture]:not([data-leaving])";

/**
 * One tab's picture on the stage. `key` is new at every tab picked, so a tab's layer always mounts afresh;
 * the picture inside it remounts on its own replays, which leave the layer, and its motion, alone.
 */
type Layer = { skill: SkillId; key: number };

const noop = () => {};

type PictureLayerProps = {
  /** The picture of a tab just picked: it rises in out of a blur. */
  arriving?: boolean;
  /** The picture of the tab just left, sinking away under the new one: hidden from everyone, and stopped. */
  leaving?: boolean;
  /** Its exit is over, run or cut short: take it off the stage. */
  onLeft?: () => void;
  children: ReactNode;
};

/**
 * A picture's layer on the stage. The picture showing fills the stage on a
 * wide screen and sets its height on a narrow one, where the stage's height
 * follows it; one leaving lies over it, out of the flow, from the top.
 */
function PictureLayer({ arriving = false, leaving = false, onLeft, children }: PictureLayerProps) {
  const ref = useRef<HTMLDivElement>(null);
  useLayerMotion(ref, { arriving, leaving, onLeft });
  return (
    <div
      ref={ref}
      data-picture
      data-leaving={leaving || undefined}
      aria-hidden={leaving || undefined}
      inert={leaving}
      className={leaving ? "absolute inset-0 max-lg:bottom-auto" : "absolute inset-0 max-lg:relative"}
    >
      {children}
    </div>
  );
}

/**
 * The four skills behind one tab row: a picture of each on a dotted stage,
 * with what the skill does underneath. A picture plays when the stage comes
 * into view and again on each tab; once it finishes it holds its last frame,
 * then plays again from the start, for as long as the stage stays in view.
 * The slice picture loops by itself.
 *
 * The stage moves as the demo stages do. The first time it comes into view it
 * enters in two beats, its frame and then its picture, and the picture plays
 * once it is in place. On a tab change the old picture, stopped where it was,
 * sinks away under the new one, which rises in just after from its first
 * frame. On a narrow screen, where the stage is as tall as its picture, it
 * glides to the new picture's height. The caption changes word by word. A
 * picture's own replays (the loop, the stage coming back into view, a layout
 * that moved under it) start the picture again inside its layer, so they never
 * replay any of that. A reader who asked for less motion sees the stage
 * already in place, and tabs that change at once.
 */
export function HarnessShowcase() {
  // The tab showing, the one just left while it sinks away under it (with the run it was on, so its picture
  // stays as it was), and which tab showed before (its caption's words come in from that side).
  const [layers, setLayers] = useState<{ current: Layer; leaving: (Layer & { run: number }) | null; previous: number }>({
    current: { skill: "map", key: 0 },
    leaving: null,
    previous: 0,
  });
  const [loop, dispatch] = useReducer(harnessLoop, HARNESS_LOOP_START);
  const reducedMotion = useReducedMotion();
  const [watchInView, inView] = useInView<HTMLDivElement>({ threshold: 0.3 });
  const { watch: watchEntry, entry, waiting, settled } = useStageEntry(SHOWING, reducedMotion);
  const stageNode = useRef<HTMLDivElement | null>(null);
  const stageRef = useCallback(
    (node: HTMLDivElement | null) => {
      stageNode.current = node;
      watchInView(node);
      watchEntry(node);
    },
    [watchInView, watchEntry],
  );
  const measureGlide = useStageGlide(layers.current.key, stageNode, reducedMotion);
  if (inView !== loop.shown) dispatch(inView ? "shown" : "hidden");

  useEffect(() => {
    if (!loop.holding) return;
    const timer = window.setTimeout(() => dispatch("held"), HARNESS_HOLD);
    return () => clearTimeout(timer);
  }, [loop.holding]);

  const restart = useCallback(() => dispatch("restart"), []);
  const done = useCallback(() => dispatch("done"), []);
  const skill = layers.current.skill;
  const index = harness.skills.findIndex((candidate) => candidate.id === skill);

  // A tab picked mid-change drops the picture still leaving at once, so there are never more than two.
  const choose = (next: SkillId) => {
    if (next === skill) return;
    measureGlide();
    setLayers(({ current }) => ({
      current: { skill: next, key: current.key + 1 },
      leaving: reducedMotion ? null : { ...current, run: loop.run },
      previous: index,
    }));
    restart();
  };
  const dropLeaving = (key: number) => setLayers((was) => (was.leaving?.key === key ? { ...was, leaving: null } : was));

  const current = skillOf(skill);
  const Picture = pictures[skill];
  const { leaving } = layers;
  const Leaving = leaving && pictures[leaving.skill];

  return (
    <>
      <TabList
        label={harness.tabsLabel}
        idBase={ID_BASE}
        tabs={tabs}
        value={skill}
        onChange={choose}
        className="mb-4 flex flex-wrap gap-2"
        tabClassName="inline-flex cursor-pointer items-center gap-2 rounded-pill border border-line bg-panel px-3.5 py-2.5 text-14 leading-none font-medium text-muted aria-selected:border-ink aria-selected:text-ink"
      />
      {/* Clipped, not hidden: a picture sunk past the foot must not make the stage scroll. */}
      <div
        ref={stageRef}
        role="tabpanel"
        id={tabPanelId(ID_BASE, skill)}
        aria-labelledby={tabId(ID_BASE, skill)}
        aria-describedby={CAPTION_ID}
        // The loop's state, for the end-to-end tests to wait on rather than on the clock.
        data-run={loop.run}
        data-shown={loop.shown || undefined}
        data-holding={loop.holding || undefined}
        data-entry={entry}
        className={`${showcase.stage} relative aspect-video max-w-full overflow-clip rounded-16 border border-line bg-card bg-dots max-lg:aspect-auto`}
      >
        {leaving && Leaving && (
          <PictureLayer key={leaving.key} leaving onLeft={() => dropLeaving(leaving.key)}>
            {/* Stopped, it stays on the frame it had reached. */}
            <Leaving key={leaving.run} running={false} onStale={noop} onDone={noop} />
          </PictureLayer>
        )}
        <PictureLayer key={layers.current.key} arriving={layers.current.key > 0 && !reducedMotion}>
          {/* A new key starts the picture from its first frame. */}
          <Picture key={loop.run} running={loop.shown && settled} onStale={restart} onDone={done} />
        </PictureLayer>
      </div>
      {/* What describes the picture for assistive technology; the caption under the stage is drawn for the eye. */}
      <p id={CAPTION_ID} className="sr-only">
        {current.label}. {current.caption}
      </p>
      <WordCaption
        steps={captions}
        step={index}
        previous={layers.previous}
        waiting={waiting}
        entryDelay={entryCaptionDelay}
        className="mt-4 max-w-caption text-14 text-pretty text-muted [&_b]:font-medium [&_b]:text-ink [&_p]:inline [&_b+p]:before:content-['_']"
      />
    </>
  );
}
