"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { occupied, skill, slice } from "@/content/harness";
import { useReducedMotion } from "@/hooks/use-media-query";
import { SLICE_FIRST, SLICE_HOLD, SLICE_RESUME, inSlice, nextSlice } from "@/lib/harness-slice";
import { Card, Flow, Side, Skill, flowColumns } from "./Flow";
import { MiniBoard, restingLook } from "./MiniBoard";
import type { PictureProps } from "./pictures";

const { command } = skill("slice");
const count = slice.kinds.length;

/**
 * The slice: one kind after another is picked on the left, and that part of
 * the blueprint lights on the right. It loops by itself; pointing at a kind
 * (or focusing it) holds it there, and the loop carries on from that kind
 * once the pointer leaves.
 */
export function SlicePicture({ running }: PictureProps) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState<number | null>(null);
  const loop = useRef({ next: 0, timer: 0 });

  const playFrom = useCallback((delay: number) => {
    const state = loop.current;
    clearTimeout(state.timer);
    const tick = () => {
      setShown(state.next);
      state.next = nextSlice(state.next, count);
      state.timer = window.setTimeout(tick, SLICE_HOLD);
    };
    state.timer = window.setTimeout(tick, delay);
  }, []);

  useEffect(() => {
    if (!running || reduced) return;
    const state = loop.current;
    playFrom(SLICE_FIRST);
    return () => clearTimeout(state.timer);
  }, [running, reduced, playFrom]);

  // A loop resumed after a hold outlives the effect above, so stop it on unmount too.
  useEffect(() => {
    const state = loop.current;
    return () => clearTimeout(state.timer);
  }, []);

  const hold = (kind: number) => {
    clearTimeout(loop.current.timer);
    setShown(kind);
    loop.current.next = nextSlice(kind, count);
  };
  const resume = () => {
    clearTimeout(loop.current.timer);
    if (!reduced) playFrom(SLICE_RESUME);
  };

  // With reduced motion the first kind shows and stays until one is picked.
  const current = shown ?? (reduced ? 0 : null);
  const kind = current === null ? null : (slice.kinds[current]?.id ?? null);

  return (
    <Flow className={flowColumns}>
      <Side label={slice.sources}>
        <div className="grid gap-2 max-lg:flex max-lg:flex-wrap max-lg:gap-1.5" onMouseLeave={resume} onBlur={resume}>
          {slice.kinds.map((k, i) => {
            const on = i === current;
            return (
              <button
                key={k.id}
                type="button"
                aria-pressed={on}
                onMouseEnter={() => hold(i)}
                onFocus={() => hold(i)}
                onClick={() => hold(i)}
                className={`flex cursor-pointer items-baseline justify-start gap-2.5 rounded-8 border bg-panel px-[.9em] py-[.7em] text-left transition-[opacity,border-color,box-shadow] duration-300 motion-reduce:transition-none ${
                  on ? "border-brand opacity-100 shadow-focus" : "border-line-2 opacity-50"
                }`}
              >
                <b>{k.label}</b>
              </button>
            );
          })}
        </div>
      </Side>
      <Skill command={command} pings={0} />
      <Side label={slice.result}>
        <Card>
          <MiniBoard
            cell={(lane, step) => {
              const rest = restingLook(lane, step);
              if (kind === null) return { className: rest };
              if (!inSlice(kind, lane, step)) return { className: `${rest} opacity-30` };
              return { className: `border-dashed border-brand bg-brand-soft before:opacity-45 ${occupied[lane]?.[step] ? "" : "before:hidden"}` };
            }}
          />
        </Card>
      </Side>
    </Flow>
  );
}
