"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  drawHeights,
  lengthAtHeight,
  nodePoints,
  railPath,
  reachedCount,
  type LengthSample,
  type NodePoint,
} from "@/lib/ideas-timeline";
import { useMediaQuery, useReducedMotion } from "./use-media-query";

export type TimelineLayout = {
  width: number;
  height: number;
  middle: number;
  points: NodePoint[];
  /** Where the line ends: the top edge of the element marked `data-end`. */
  endY: number;
  path: string;
};

export type TimelineProgress = {
  /** How many nodes, top first, the green line has reached. */
  nodes: number;
  /** The line has reached its end. */
  end: boolean;
};

/** Samples taken along the line to find how much of it is drawn at a height. */
const SAMPLES = 200;
/** The end card arrives a hair before the line touches it, so the two land together. */
const END_LEAD = 2;

const sameProgress = (a: TimelineProgress, b: TimelineProgress) => a.nodes === b.nodes && a.end === b.end;

/**
 * Draws the ideas timeline as the reader scrolls. The line is laid out from
 * the cards (elements marked `data-voice`) and runs on to the element marked
 * `data-end`; the grey track (`track`) runs ahead and the green line (`line`)
 * follows. Only wide screens show the timeline, so only they measure and listen.
 */
export function useTimeline<T extends HTMLElement>() {
  const [element, setElement] = useState<T | null>(null);
  const [layout, setLayout] = useState<TimelineLayout | null>(null);
  const [progress, setProgress] = useState<TimelineProgress>({ nodes: 0, end: false });
  const track = useRef<SVGPathElement>(null);
  const line = useRef<SVGPathElement>(null);
  const wide = useMediaQuery("(min-width: 761px)");
  const reduced = useReducedMotion();

  // Lay the line out from where the cards sit, again whenever the timeline changes size.
  useEffect(() => {
    if (!element || !wide) return;
    const root = element;
    function measure() {
      const width = root.clientWidth;
      if (!width) return;
      // Cards slide in sideways, so their sides come from the layout box, untransformed;
      // their tops come from the rendered box, which keeps the fraction offsetTop drops.
      const rootTop = root.getBoundingClientRect().top;
      const cards = [...root.querySelectorAll<HTMLElement>("[data-voice]")].map((card) => ({
        top: card.getBoundingClientRect().top - rootTop,
        left: card.offsetLeft,
        right: card.offsetLeft + card.offsetWidth,
      }));
      const end = root.querySelector<HTMLElement>("[data-end]");
      const height = root.clientHeight;
      const middle = width / 2;
      const points = nodePoints(cards, width);
      const endY = end ? end.offsetTop : height;
      setLayout({ width, height, middle, points, endY, path: railPath(points, middle, endY) });
    }
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
  }, [element, wide]);

  // Follow the scroll: the track and the line by their dash offsets, the nodes and the end by state.
  useLayoutEffect(() => {
    const trackPath = track.current;
    const linePath = line.current;
    if (!element || !layout || !trackPath || !linePath || !wide) return;
    const root = element;
    const length = linePath.getTotalLength();
    const samples: LengthSample[] = [];
    for (let i = 0; i <= SAMPLES; i++) {
      const at = (length * i) / SAMPLES;
      samples.push({ y: linePath.getPointAtLength(at).y, length: at });
    }
    for (const path of [trackPath, linePath]) path.style.strokeDasharray = `${length}`;
    const heights = layout.points.map((point) => point.y);

    const endY = layout.endY;
    let frame = 0;
    const draw = () => {
      frame = 0;
      const { track: ahead, reached } = drawHeights(innerHeight, root.getBoundingClientRect().top, reduced);
      trackPath.style.strokeDashoffset = `${length - lengthAtHeight(samples, ahead)}`;
      linePath.style.strokeDashoffset = `${length - lengthAtHeight(samples, reached)}`;
      const next = { nodes: reachedCount(heights, reached), end: endY <= reached + END_LEAD };
      setProgress((was) => (sameProgress(was, next) ? was : next));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };
    // Hidden until the first frame places it, so the line never flashes in whole.
    trackPath.style.strokeDashoffset = `${length}`;
    linePath.style.strokeDashoffset = `${length}`;
    addEventListener("scroll", schedule, { passive: true });
    schedule();
    return () => {
      removeEventListener("scroll", schedule);
      cancelAnimationFrame(frame);
    };
  }, [element, layout, wide, reduced]);

  const ref = useCallback((node: T | null) => setElement(node), []);
  return { ref, track, line, layout: wide ? layout : null, progress };
}
