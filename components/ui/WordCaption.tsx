"use client";

import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import { vars } from "@/components/ui/vars";
import { captionDelays } from "@/lib/caption";
import s from "./WordCaption.module.css";

type Step = { readonly title: string; readonly caption: string };

/**
 * One caption on screen: arriving (`from`, then `in` once its words have their delays) or leaving (`out`).
 * `entry` marks one held for its entry, whose words arrive `entryDelay` later.
 */
type Layer = { id: number; step: number; phase: "from" | "in" | "out"; direction: 1 | -1; entry?: boolean };

type WordCaptionProps = {
  steps: readonly Step[];
  step: number;
  previous: number;
  /** Held unseen at the arriving pose until this is false, when its words arrive as on a change. */
  waiting?: boolean;
  /** How much later the words arrive when the hold ends, in ms, read as they are let go. */
  entryDelay?: () => number;
  className?: string;
};

/**
 * A title and caption, drawn for the eye only (the page names it for
 * assistive technology from a copy beside this). On a step change the old
 * caption leaves as the new one arrives, laid over the same box: each word
 * rises out of a blur, the title first, then every line left to right
 * (right to left going back), on the caption motion's duration and curve.
 * The walkthrough and the showcases share it.
 *
 * Interrupted, whatever is still leaving goes at once and the caption that
 * was arriving leaves from wherever it had got to (its words carry on under
 * the layer's own exit), so there are never more than two, and once the old
 * one's exit has run there is one, at rest.
 *
 * `previous` is the step shown before, which says which way the change went.
 *
 * `waiting` holds the caption unseen at the arriving pose, for an entry still
 * to come; when it ends, the words arrive as on a change, `entryDelay` later.
 */
export function WordCaption({ steps, step, previous, waiting = false, entryDelay, className = "" }: WordCaptionProps) {
  const root = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);
  const [layers, setLayers] = useState<Layer[]>(() => [{ id: 0, step, phase: "in", direction: 1 }]);

  useLayoutEffect(() => {
    const direction: 1 | -1 = step < previous ? -1 : 1;
    const id = nextId.current++;
    setLayers((was) => {
      const current = was.findLast((layer) => layer.phase !== "out");
      // Only a new step starts a change (not the first run, nor `previous` alone changing).
      if (current?.step === step) return was;
      return [
        ...(current ? [{ ...current, phase: "out" as const, direction }] : []),
        { id, step, phase: "from", direction },
      ];
    });
  }, [step, previous]);

  // Held for an entry, the caption showing goes back to its arriving pose, unseen, until it is let go.
  const showing = layers.findLast((layer) => layer.phase !== "out");
  if (waiting && showing?.phase === "in") {
    setLayers((was) => was.map((layer) => (layer.id === showing.id ? { ...layer, phase: "from", entry: true } : layer)));
  }

  // The new caption is laid out at its starting pose: its lines are read, which also fixes
  // that pose for the browser, each word gets its delay, and then it is let go.
  useLayoutEffect(() => {
    const arriving = layers.find((layer) => layer.phase === "from");
    if (!arriving || waiting) return;
    const element = root.current?.querySelector<HTMLElement>(`[data-id="${arriving.id}"]`);
    if (!element) return;
    const words = [...element.querySelectorAll<HTMLElement>(`p > .${s.piece}`)];
    const lines: HTMLElement[][] = [];
    for (const word of words) {
      const line = lines.at(-1);
      if (line && Math.abs(line[0]!.offsetTop - word.offsetTop) < 2) line.push(word);
      else lines.push([word]);
    }
    const delays = captionDelays(
      lines.map((line) => line.length),
      arriving.direction,
    );
    const later = arriving.entry ? (entryDelay?.() ?? 0) : 0;
    const title = element.querySelector<HTMLElement>(`b > .${s.piece}`);
    title?.style.setProperty("--cap-delay", `${later}ms`);
    lines.forEach((line, l) => line.forEach((word, i) => word.style.setProperty("--cap-delay", `${later + delays[l]![i]!}ms`)));
    setLayers((was) => was.map((layer) => (layer.id === arriving.id ? { ...layer, phase: "in", entry: false } : layer)));
  }, [layers, waiting, entryDelay]);

  // The old caption goes once its exit, and any word still arriving under it, has run; at
  // once if nothing is running (transitions off, or a duration of nothing).
  const leaving = layers.find((layer) => layer.phase === "out")?.id;
  useEffect(() => {
    if (leaving === undefined) return;
    const element = root.current?.querySelector<HTMLElement>(`[data-id="${leaving}"]`);
    if (!element) return;
    let live = true;
    const remove = () => {
      if (live) setLayers((was) => was.filter((layer) => layer.id !== leaving));
    };
    void getComputedStyle(element).opacity; // the exit's transitions start with the style it now has
    const running = element.getAnimations({ subtree: true });
    const timer = running.length ? 0 : window.setTimeout(remove);
    if (running.length) void Promise.allSettled(running.map((animation) => animation.finished)).then(remove);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [leaving]);

  return (
    <div ref={root} className={`${s.cap} ${className}`} data-caption aria-hidden>
      {layers.map((layer) => {
        const { title, caption } = steps[layer.step]!;
        return (
          <div
            key={layer.id}
            data-id={layer.id}
            data-phase={layer.phase}
            className={s.capLayer}
            style={vars({ "--cap-dir": layer.direction })}
          >
            <b>
              <span className={s.piece}>{title}</span>
            </b>
            <p>
              {caption.split(" ").map((word, i) => (
                <Fragment key={i}>
                  {i > 0 && " "}
                  <span className={s.piece}>{word}</span>
                </Fragment>
              ))}
            </p>
          </div>
        );
      })}
    </div>
  );
}
