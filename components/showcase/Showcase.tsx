"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { Maximize2, Pause, Play } from "lucide-react";
import { showcase } from "@/content/showcase";
import { revealOnHover } from "@/components/reveal";
import { TabList, tabId, tabPanelId } from "@/components/ui/Tabs";
import { useInView } from "@/hooks/use-in-view";
import { useReducedMotion } from "@/hooks/use-media-query";
import { shouldPlay, wantsPlay, type ShowcaseTab } from "@/lib/recording";
import { Recording, type RecordingHandle } from "./Recording";

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

/**
 * A row of pill tabs over a framed stage with a caption under it. Selecting a
 * tab swaps the stage's recording and the caption; the two together are the
 * tab's panel. The recording plays while its stage is on screen, until the
 * reader pauses it; a reader who asked for less motion starts it themselves,
 * and the phone's recording never zooms for them.
 *
 * On a phone the stage leaves 16:9: the canvas's is 3:2, and a showcase with
 * a phone stands taller so the phone's screen reads. Every tab of a showcase
 * shares its stage's shape, so switching tabs never moves the page. A second
 * button there opens the recording fullscreen.
 */
export function Showcase<T extends string>({ idBase, label, items }: ShowcaseProps<T>) {
  const [value, setValue] = useState(items[0]?.value);
  const [choice, setChoice] = useState<boolean | null>(null);
  const reducedMotion = useReducedMotion();
  const [stage, inView] = useInView<HTMLDivElement>();
  // The poster waits until the stage is near, so it never competes with the page's first paint.
  const [nearStage, near] = useInView<HTMLDivElement>({ rootMargin: "50% 0px", once: true });
  const recording = useRef<RecordingHandle>(null);
  const stageRef = useCallback(
    (node: HTMLDivElement | null) => {
      stage(node);
      nearStage(node);
    },
    [stage, nearStage],
  );
  const item = items.find((candidate) => candidate.value === value) ?? items[0];
  if (!item) return null;

  const wanted = wantsPlay({ choice, reducedMotion });
  const captionId = `${tabPanelId(idBase, item.value)}-caption`;
  const Icon = wanted ? Pause : Play;
  const tall = items.some((candidate) => candidate.phone);
  const buttonClass =
    "grid size-8 cursor-pointer place-items-center rounded-8 border border-line-2 bg-panel text-muted transition-[color,border-color] duration-t-1 motion-reduce:transition-none hover:border-line-hot hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

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
        onChange={setValue}
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
          className={`group relative aspect-video max-w-full overflow-clip rounded-16 border border-line bg-card bg-dots ${tall ? "max-sm:aspect-stage-tall" : "max-sm:aspect-stage-canvas-phone"}`}
        >
          <Recording
            key={item.value}
            ref={recording}
            name={item.recording}
            phone={item.phone}
            masked={item.masked ?? false}
            zoom={reducedMotion ? undefined : item.zoom}
            near={near}
            playing={shouldPlay({ choice, reducedMotion, inView })}
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
        <p id={captionId} className="mt-4 max-w-caption text-14 text-muted">
          <b className="font-medium text-ink">{item.label}.</b> {item.caption}
        </p>
      </div>
    </>
  );
}
