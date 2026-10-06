"use client";

import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Maximize2, Pause, Play } from "lucide-react";
import { showcase } from "@/content/showcase";
import { revealOnHover } from "@/components/reveal";
import { TabList, tabId, tabPanelId } from "@/components/ui/Tabs";
import { WordCaption } from "@/components/ui/WordCaption";
import { useInView } from "@/hooks/use-in-view";
import { useReducedMotion } from "@/hooks/use-media-query";
import { useStageGlide } from "@/hooks/use-stage-glide";
import { shouldPlay, wantsPlay, type ShowcaseTab } from "@/lib/recording";
import { Recording, type RecordingHandle } from "./Recording";
import s from "./Showcase.module.css";
import { arriveRecording, enterStage, entryCaptionDelay } from "./stage-motion";

export type ShowcaseItem<T extends string> = ShowcaseTab<T> & {
  icon: ReactNode;
  /** The recording is a phone's, the handset alone on the stage. */
  phone: boolean;
};

type ShowcaseProps<T extends string> = {
  /** Prefix for the ids of the tabs and their panels. */
  idBase: string;
  /** Names the tab row for assistive technology. */
  label: string;
  items: readonly ShowcaseItem<T>[];
};

/** One recording on the stage. `key` is new at every tab change, so a recording always mounts afresh. */
type Layer<T> = { value: T | undefined; key: number };

/** Whether any of `element` is on screen. */
const onScreenNow = (element: Element) => {
  const { top, bottom } = element.getBoundingClientRect();
  return bottom > 0 && top < innerHeight;
};

/**
 * A row of pill tabs over a framed stage with a caption under it. Selecting a
 * tab swaps the stage's recording and the caption; the two together are the
 * tab's panel. The recording plays while its stage is on screen, until the
 * reader pauses it; a reader who asked for less motion starts it themselves,
 * and the phone's recording never zooms for them.
 *
 * On a phone the stage leaves 16:9 and each tab takes its own: a window's is
 * 3:2, snug round it, and the phone's stands taller so its screen reads.
 * Switching between a window and the phone moves what is below, but a tab's
 * stage never changes size while it shows: the phone's zoom is a transform. A
 * second button there opens the recording fullscreen.
 *
 * The first time the stage comes into view it enters in two beats, its frame
 * and then its recording, and the recording plays once it is in place. On a
 * tab change the old recording, paused, sinks away under the new one, which
 * rises in just after; the old one stays on the stage only while it goes.
 * Where the stage's height changes it glides there (`useStageGlide`). The
 * caption changes word by word, as the walkthrough's does (`WordCaption`).
 * The motion is in stage-motion.ts. A reader who asked for less motion sees
 * the stage already in place, and tabs that change at once.
 */
export function Showcase<T extends string>({ idBase, label, items }: ShowcaseProps<T>) {
  // The tab showing, the one just left while it sinks away under it, and which tab showed before (its
  // caption's words come in from that side).
  const [layers, setLayers] = useState<{ current: Layer<T>; leaving: Layer<T> | null; previous: number }>({
    current: { value: items[0]?.value, key: 0 },
    leaving: null,
    previous: 0,
  });
  const [choice, setChoice] = useState<boolean | null>(null);
  const reducedMotion = useReducedMotion();
  // Whether the stage was on screen as the page went live, or null before then (in the server's HTML, and
  // while hydrating). A stage already in sight is simply there; only one still to come waits for its entry.
  const [inSightAtLoad, setInSightAtLoad] = useState<boolean | null>(null);
  // The recording plays while its stage is on screen.
  const [watchOnScreen, onScreen] = useInView<HTMLDivElement>();
  // The poster waits until the stage is near, so it never competes with the page's first paint.
  const [watchNear, near] = useInView<HTMLDivElement>({ rootMargin: "50% 0px", once: true });
  // The entry waits until the stage is well into view, so it is seen.
  const [watchEntry, entered] = useInView<HTMLDivElement>({ threshold: 0.25, once: true });
  // The entry has run, or been cut short: the recording is in place.
  const [entryDone, setEntryDone] = useState(false);
  const recording = useRef<RecordingHandle>(null);
  const stageNode = useRef<HTMLDivElement | null>(null);
  const stageRef = useCallback(
    (node: HTMLDivElement | null) => {
      stageNode.current = node;
      if (node) setInSightAtLoad((was) => was ?? onScreenNow(node));
      watchOnScreen(node);
      watchNear(node);
      watchEntry(node);
    },
    [watchOnScreen, watchNear, watchEntry],
  );
  const measureGlide = useStageGlide(layers.current.key, stageNode, reducedMotion);

  // Once the page is live, a stage then off screen waits for its entry, unless the reader asked for less motion.
  const waiting = inSightAtLoad === false && !entered && !reducedMotion;
  // The entry, as the waiting ends: the frame, then the recording, while the caption's words come in.
  const wasWaiting = useRef(false);
  useLayoutEffect(() => {
    if (waiting) {
      wasWaiting.current = true;
      return;
    }
    if (!wasWaiting.current) return;
    wasWaiting.current = false;
    const stage = stageNode.current;
    if (!stage || reducedMotion) return;
    void enterStage(stage, stage.querySelector("[data-recording]:not([data-leaving])")).then(() => setEntryDone(true));
  }, [waiting, reducedMotion]);

  // The recording of a tab just picked rises in as it first shows: once for each pick, so turning the reader's
  // motion setting off and on again never replays it.
  const shownKey = layers.current.key;
  const arrivedFor = useRef(shownKey);
  useLayoutEffect(() => {
    if (arrivedFor.current === shownKey) return;
    arrivedFor.current = shownKey;
    const layer = stageNode.current?.querySelector<HTMLElement>("[data-recording]:not([data-leaving])");
    if (layer && !reducedMotion) arriveRecording(layer);
  }, [shownKey, reducedMotion]);

  // Asked for less motion mid-change, whatever is moving on the stage comes to rest at once; a recording
  // leaving goes with it.
  useLayoutEffect(() => {
    if (!reducedMotion) return;
    for (const animation of stageNode.current?.getAnimations({ subtree: true }) ?? []) animation.finish();
  }, [reducedMotion]);

  // The recording plays once the entry has brought it into place. With less motion, or a stage in sight from
  // the start, there is no entry to wait for.
  const inPlace = entryDone || reducedMotion || inSightAtLoad === true;

  const tabOf = (layer: Layer<T> | null) => layer && items.find((candidate) => candidate.value === layer.value);
  const item = tabOf(layers.current) ?? items[0];
  if (!item) return null;
  const leaving = layers.leaving && { key: layers.leaving.key, tab: tabOf(layers.leaving) };

  // A tab picked mid-change drops the recording still leaving at once, so there are never more than two.
  const pick = (next: T) => {
    if (next === item.value) return;
    measureGlide();
    setLayers(({ current }) => ({
      current: { value: next, key: current.key + 1 },
      leaving: reducedMotion ? null : current,
      previous: items.indexOf(item),
    }));
  };
  const dropLeaving = (key: number) =>
    setLayers((was) => (was.leaving?.key === key ? { ...was, leaving: null } : was));
  const wanted = wantsPlay({ choice, reducedMotion });
  const captionId = `${tabPanelId(idBase, item.value)}-caption`;
  // What a tab's recording is, whether it is showing or leaving.
  const recordingOf = (tab: ShowcaseItem<T>) => ({
    name: tab.recording,
    phone: tab.phone,
    masked: tab.masked ?? false,
    zoom: reducedMotion ? undefined : tab.zoom,
    near,
    labelledBy: captionId,
  });
  const Icon = wanted ? Pause : Play;
  const buttonClass =
    "grid size-8 cursor-pointer place-items-center rounded-8 border border-line-2 bg-panel text-muted transition-[color,border-color] duration-t-1 motion-reduce:transition-none hover:border-line-hot hover:text-ink";

  const expand = () => {
    // A reader who opens the recording wants it moving, as the pause button's Play would.
    setChoice(true);
    recording.current?.expand();
  };

  return (
    <>
      <TabList
        label={label}
        idBase={idBase}
        tabs={items}
        value={item.value}
        onChange={pick}
        className="mb-4 flex flex-wrap gap-2"
        tabClassName="inline-flex cursor-pointer items-center gap-2 rounded-pill border border-line bg-panel px-3.5 py-2.5 text-14 leading-none font-medium text-muted aria-selected:border-ink aria-selected:text-ink"
      />
      <div
        role="tabpanel"
        id={tabPanelId(idBase, item.value)}
        aria-labelledby={tabId(idBase, item.value)}
      >
        {/* Clipped, not hidden: a window sunk past the foot must not make the stage scroll. */}
        <div
          ref={stageRef}
          data-testid="showcase-stage"
          data-entry={inSightAtLoad === null ? undefined : waiting ? "waiting" : "in"}
          className={`${s.stage} group relative aspect-video max-w-full overflow-clip rounded-16 border border-line bg-card bg-dots ${item.phone ? "max-sm:aspect-stage-tall" : "max-sm:aspect-stage-window-phone"}`}
        >
          {leaving?.tab && (
            <Recording
              key={leaving.key}
              {...recordingOf(leaving.tab)}
              playing={false}
              leaving
              onLeft={() => dropLeaving(leaving.key)}
            />
          )}
          <Recording
            key={layers.current.key}
            ref={recording}
            {...recordingOf(item)}
            playing={shouldPlay({ choice, reducedMotion, inView: onScreen }) && inPlace}
          />
          {/*
            Pause/Play shows while the stage is pointed at or focused, and always
            on a touch screen; there the fullscreen button sits under it.
          */}
          <div className="absolute top-3.5 right-3.5 z-6 flex flex-col gap-2 max-lg:top-2 max-lg:right-2">
            <div className={`flex ${revealOnHover}`}>
              <button
                type="button"
                aria-label={wanted ? showcase.pause : showcase.play}
                title={wanted ? showcase.pause : showcase.play}
                onClick={() => setChoice(!wanted)}
                className={buttonClass}
              >
                <Icon className="size-icon-sm" strokeWidth={1.75} aria-hidden />
              </button>
            </div>
            <button
              type="button"
              aria-label={showcase.fullscreen}
              title={showcase.fullscreen}
              onClick={expand}
              className={`${buttonClass} sm:hidden`}
            >
              <Maximize2 className="size-icon-sm" strokeWidth={1.75} aria-hidden />
            </button>
          </div>
        </div>
        {/* What names the recording for assistive technology; the caption under the stage is drawn for the eye. */}
        <p id={captionId} className="sr-only">
          {item.label}. {item.caption}
        </p>
        <WordCaption
          steps={items.map((tab) => ({ title: `${tab.label}.`, caption: tab.caption }))}
          step={items.indexOf(item)}
          previous={layers.previous}
          waiting={waiting}
          entryDelay={entryCaptionDelay}
          className="mt-4 max-w-caption text-14 text-pretty text-muted [&_b]:font-medium [&_b]:text-ink [&_p]:inline [&_b+p]:before:content-['_']"
        />
      </div>
    </>
  );
}
