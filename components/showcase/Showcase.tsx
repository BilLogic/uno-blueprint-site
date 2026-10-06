"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { Maximize2, Pause, Play } from "lucide-react";
import { showcase } from "@/content/showcase";
import { revealOnHover } from "@/components/reveal";
import { TabList, tabId, tabPanelId } from "@/components/ui/Tabs";
import { useInView } from "@/hooks/use-in-view";
import { useReducedMotion } from "@/hooks/use-media-query";
import { useStageGlide } from "@/hooks/use-stage-glide";
import { cssMs, rootToken } from "@/lib/css-time";
import { shouldPlay, wantsPlay, type ShowcaseTab } from "@/lib/recording";
import { Recording, type RecordingHandle } from "./Recording";
import s from "./Showcase.module.css";

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

// No subscription: the value only tells the server's HTML, and hydration, from the live page.
const noSubscription = () => () => {};

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
 * The first time the stage comes into view it enters, and its recording
 * starts once it has settled. A tab change crossfades the recordings: the old
 * one, paused, stays on the stage only while it fades out under the new one
 * (Showcase.module.css), and the caption arrives with the new one. Where the
 * stage's height changes it glides there (`useStageGlide`). A reader who
 * asked for less motion sees the stage already in place, and tabs that
 * change at once.
 */
export function Showcase<T extends string>({ idBase, label, items }: ShowcaseProps<T>) {
  // The tab showing, and the one just left while it fades out under it.
  const [layers, setLayers] = useState<{ current: Layer<T>; leaving: Layer<T> | null }>({
    current: { value: items[0]?.value, key: 0 },
    leaving: null,
  });
  const [choice, setChoice] = useState<boolean | null>(null);
  const reducedMotion = useReducedMotion();
  const live = useSyncExternalStore(noSubscription, () => true, () => false);
  // The recording plays while its stage is on screen.
  const [watchOnScreen, onScreen] = useInView<HTMLDivElement>();
  // The poster waits until the stage is near, so it never competes with the page's first paint.
  const [watchNear, near] = useInView<HTMLDivElement>({ rootMargin: "50% 0px", once: true });
  // The entry waits until the stage is well into view, so it is seen.
  const [watchEntry, entered] = useInView<HTMLDivElement>({ threshold: 0.25, once: true });
  const [settled, setSettled] = useState(false);
  const recording = useRef<RecordingHandle>(null);
  const stageNode = useRef<HTMLDivElement | null>(null);
  const stageRef = useCallback(
    (node: HTMLDivElement | null) => {
      stageNode.current = node;
      watchOnScreen(node);
      watchNear(node);
      watchEntry(node);
    },
    [watchOnScreen, watchNear, watchEntry],
  );
  const measureGlide = useStageGlide(layers.current.key, stageNode, reducedMotion);

  // The recording starts once the entry has run; with less motion there is none to wait for.
  useEffect(() => {
    if (settled || !(entered || reducedMotion)) return;
    const timer = window.setTimeout(() => setSettled(true), reducedMotion ? 0 : cssMs(rootToken("--duration-t-3")));
    return () => clearTimeout(timer);
  }, [entered, settled, reducedMotion]);

  const find = (layer: Layer<T> | null) => layer && items.find((candidate) => candidate.value === layer.value);
  const item = find(layers.current) ?? items[0];
  if (!item) return null;
  const left = find(layers.leaving);
  const leavingKey = layers.leaving?.key;

  // A tab picked mid-change drops the recording still leaving at once, so there are never more than two.
  const pick = (next: T) => {
    if (next === item.value) return;
    measureGlide();
    setLayers(({ current }) => ({ current: { value: next, key: current.key + 1 }, leaving: reducedMotion ? null : current }));
  };
  const dropLeaving = (key: number) =>
    setLayers((was) => (was.leaving?.key === key ? { ...was, leaving: null } : was));
  // Only a tab picked arrives; the first one is simply there.
  const arrive = layers.current.key > 0 ? s.arrive : undefined;
  const wanted = wantsPlay({ choice, reducedMotion });
  const captionId = `${tabPanelId(idBase, item.value)}-caption`;
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
          data-entry={live ? (entered ? "in" : "waiting") : undefined}
          className={`${s.stage} group relative aspect-video max-w-full overflow-clip rounded-16 border border-line bg-card bg-dots ${item.phone ? "max-sm:aspect-stage-tall" : "max-sm:aspect-stage-window-phone"}`}
        >
          {left && leavingKey !== undefined && (
            <Recording
              key={leavingKey}
              name={left.recording}
              phone={left.phone}
              masked={left.masked ?? false}
              zoom={reducedMotion ? undefined : left.zoom}
              near={near}
              playing={false}
              labelledBy={captionId}
              className={s.leave}
              leaving
              onLeft={() => dropLeaving(leavingKey)}
            />
          )}
          <Recording
            key={layers.current.key}
            ref={recording}
            className={arrive}
            name={item.recording}
            phone={item.phone}
            masked={item.masked ?? false}
            zoom={reducedMotion ? undefined : item.zoom}
            near={near}
            playing={shouldPlay({ choice, reducedMotion, inView: onScreen }) && settled}
            labelledBy={captionId}
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
        <p key={layers.current.key} id={captionId} className={`mt-4 max-w-caption text-14 text-pretty text-muted ${arrive ?? ""}`}>
          <b className="font-medium text-ink">{item.label}.</b> {item.caption}
        </p>
      </div>
    </>
  );
}
