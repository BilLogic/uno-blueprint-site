"use client";

import { Fragment, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { captionDelays } from "@/lib/caption";
import s from "./Walkthrough.module.css";

type Step = { readonly title: string; readonly caption: string };

/** One caption on screen: arriving (`from`, then `in` once its words have their delays) or leaving (`out`). */
type Layer = { id: number; step: number; phase: "from" | "in" | "out"; direction: 1 | -1 };

/** The longest transition on `element`, delay included, in ms. */
function transitionMs(element: Element): number {
  const style = getComputedStyle(element);
  const ms = (list: string) => list.split(",").map((t) => parseFloat(t) * (t.trim().endsWith("ms") ? 1 : 1000) || 0);
  const durations = ms(style.transitionDuration);
  const delays = ms(style.transitionDelay);
  return Math.max(0, ...durations.map((d, i) => d + (delays[i % delays.length] ?? 0)));
}

/**
 * The step's title and caption, drawn for the eye only (the walkthrough reads
 * them out once, from a live copy beside this). On a step change the old
 * caption leaves as the new one arrives, laid over the same box: each word
 * rises out of a blur, the title first, then every line left to right
 * (right to left going back), on the board's own duration and curve.
 *
 * Interrupted, whatever is still leaving goes at once and the caption that
 * was arriving leaves from wherever it had got to, as transitions turn from
 * their current value, so there are never more than two, and once the old
 * one's exit has run there is one, at rest.
 */
export function Caption({ steps, step }: { steps: readonly Step[]; step: number }) {
  const root = useRef<HTMLDivElement>(null);
  const shown = useRef(step);
  const nextId = useRef(1);
  const [layers, setLayers] = useState<Layer[]>(() => [{ id: 0, step, phase: "in", direction: 1 }]);

  useLayoutEffect(() => {
    if (step === shown.current) return;
    const direction: 1 | -1 = step > shown.current ? 1 : -1;
    shown.current = step;
    const id = nextId.current++;
    setLayers((was) => {
      const current = was.findLast((layer) => layer.phase !== "out");
      return [
        ...(current ? [{ ...current, phase: "out" as const, direction }] : []),
        { id, step, phase: "from", direction },
      ];
    });
  }, [step]);

  // The new caption is laid out at its starting pose: its lines are read, which also fixes
  // that pose for the browser, each word gets its delay, and then it is let go.
  useLayoutEffect(() => {
    const arriving = layers.find((layer) => layer.phase === "from");
    const element = root.current?.querySelector<HTMLElement>(`[data-id="${arriving?.id}"]`);
    if (!arriving || !element) return;
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
    lines.forEach((line, l) => line.forEach((word, i) => word.style.setProperty("--cap-delay", `${delays[l]![i]}ms`)));
    setLayers((was) => was.map((layer) => (layer.id === arriving.id ? { ...layer, phase: "in" } : layer)));
  }, [layers]);

  // The old caption goes once its exit has run.
  const leaving = layers.find((layer) => layer.phase === "out")?.id;
  useEffect(() => {
    const element = root.current?.querySelector(`[data-id="${leaving}"]`);
    if (leaving === undefined || !element) return;
    const piece = element.querySelector(`.${s.piece}`);
    const ms = Math.max(transitionMs(element), piece ? transitionMs(piece) : 0);
    const timer = setTimeout(() => setLayers((was) => was.filter((layer) => layer.id !== leaving)), ms);
    return () => clearTimeout(timer);
  }, [leaving]);

  return (
    <div ref={root} className={s.cap} data-caption aria-hidden>
      {layers.map((layer) => {
        const { title, caption } = steps[layer.step]!;
        return (
          <div
            key={layer.id}
            data-id={layer.id}
            data-phase={layer.phase}
            className={s.capLayer}
            style={{ "--cap-dir": layer.direction } as CSSProperties}
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
