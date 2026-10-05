"use client";

import { useCallback, useState, type ReactNode } from "react";
import { Pause, Play } from "lucide-react";
import { showcase } from "@/content/showcase";
import { TabList, tabId, tabPanelId } from "@/components/ui/Tabs";
import { useInView } from "@/hooks/use-in-view";
import { useReducedMotion } from "@/hooks/use-media-query";
import { shouldPlay, wantsPlay } from "@/lib/recording";
import { Recording } from "./Recording";

export type ShowcaseItem<T extends string> = {
  value: T;
  label: string;
  icon: ReactNode;
  /** What the picture is about; it follows the tab's label under the stage, and names the recording. */
  caption: string;
  /** The screen recording played on the stage while this tab is selected. */
  recording: string;
  /** The recording is a phone's, played inside a handset. */
  handset: boolean;
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
 * reader pauses it; a reader who asked for less motion starts it themselves.
 */
export function Showcase<T extends string>({ idBase, label, items }: ShowcaseProps<T>) {
  const [value, setValue] = useState(items[0]?.value);
  const [choice, setChoice] = useState<boolean | null>(null);
  const reducedMotion = useReducedMotion();
  const [stage, inView] = useInView<HTMLDivElement>();
  // The poster waits until the stage is near, so it never competes with the page's first paint.
  const [nearStage, near] = useInView<HTMLDivElement>({ rootMargin: "50% 0px", once: true });
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
        <div
          ref={stageRef}
          data-testid="showcase-stage"
          className="relative aspect-video max-w-full overflow-hidden rounded-16 border border-line bg-card bg-dots"
        >
          <Recording
            key={item.value}
            name={item.recording}
            handset={item.handset}
            near={near}
            playing={shouldPlay({ choice, reducedMotion, inView })}
            labelledBy={captionId}
          />
          <button
            type="button"
            aria-label={wanted ? showcase.pause : showcase.play}
            title={wanted ? showcase.pause : showcase.play}
            onClick={() => setChoice(!wanted)}
            className="absolute top-2.5 right-2.5 z-6 grid size-8 cursor-pointer place-items-center rounded-8 border border-line-2 bg-panel text-muted transition-[color,border-color] duration-t-1 motion-reduce:transition-none hover:border-line-hot hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand max-lg:top-2 max-lg:right-2"
          >
            <Icon className="size-icon-sm" strokeWidth={1.75} aria-hidden />
          </button>
        </div>
        <p id={captionId} className="mt-4 max-w-caption text-14 text-muted">
          <b className="font-medium text-ink">{item.label}.</b> {item.caption}
        </p>
      </div>
    </>
  );
}
