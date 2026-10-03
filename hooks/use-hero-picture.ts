"use client";

import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState } from "react";
import { useInView } from "./use-in-view";
import {
  BEAM_EASING,
  HIT_KEYFRAMES,
  PING_KEYFRAMES,
  TIMING,
  beamDash,
  beamOf,
  beamPaths,
  boardReducer,
  planFeed,
  planRound,
  planStep,
  projection,
  relativeTo,
  runKeyframes,
  settledBoard,
  slotsOf,
  walkerSpot,
  type Board,
  type FeedEvent,
} from "@/lib/hero-picture";

const REDUCED = "(prefers-reduced-motion: reduce)";
/** The picture stacks into one column at the prototype's (max-width:760px). */
const STACKED = "(max-width: 760px)";

/** The elements the picture measures and animates, filled in as they mount. */
type Elements = {
  stage: HTMLDivElement | null;
  node: HTMLElement | null;
  ping: HTMLElement | null;
  sheet: HTMLElement | null;
  panel: HTMLElement | null;
  tools: (HTMLElement | null)[];
  cells: (HTMLElement | null)[];
  walkers: (HTMLElement | null)[];
  feeds: (SVGPathElement | null)[];
  toBoard: SVGPathElement | null;
  light: SVGSVGElement | null;
  projector: SVGGElement | null;
};

/** One stable ref callback per position in a list. */
function listRefs<T>(list: (T | null)[]) {
  const callbacks = new Map<number, (element: T | null) => void>();
  return (index: number) => {
    let callback = callbacks.get(index);
    if (!callback) {
      callback = (element) => {
        list[index] = element;
      };
      callbacks.set(index, callback);
    }
    return callback;
  };
}

function createElements() {
  const el: Elements = {
    stage: null,
    node: null,
    ping: null,
    sheet: null,
    panel: null,
    tools: [],
    cells: [],
    walkers: [],
    feeds: [],
    toBoard: null,
    light: null,
    projector: null,
  };
  /** Ref callbacks that attach each element; the component passes them to `ref`. */
  const attach = {
    stageRef: (element: HTMLDivElement | null) => void (el.stage = element),
    nodeRef: (element: HTMLElement | null) => void (el.node = element),
    pingRef: (element: HTMLElement | null) => void (el.ping = element),
    sheetRef: (element: HTMLElement | null) => void (el.sheet = element),
    panelRef: (element: HTMLElement | null) => void (el.panel = element),
    toBoardRef: (element: SVGPathElement | null) => void (el.toBoard = element),
    lightRef: (element: SVGSVGElement | null) => void (el.light = element),
    projectorRef: (element: SVGGElement | null) => void (el.projector = element),
    toolRef: listRefs(el.tools),
    cellRef: listRefs(el.cells),
    walkerRef: listRefs(el.walkers),
    feedRef: listRefs(el.feeds),
  };
  return { el, attach };
}

export type HeroPictureRefs = ReturnType<typeof createElements>["attach"];

/** The beams' paths, once measured. */
export type Beams = { feeds: string[]; toBoard: string };

const box = (element: Element) => element.getBoundingClientRect();

/** Stands each walker on its cell; `jump` skips the walk, as on a new round or a resize. */
function placeWalkers(el: Elements, at: Board["at"], jump: boolean) {
  const slots = slotsOf(at);
  el.walkers.forEach((walker, i) => {
    const cell = at[i] == null ? null : el.cells[at[i]];
    if (!walker || !cell) return;
    const { x, y } = walkerSpot(
      { left: cell.offsetLeft, top: cell.offsetTop, width: cell.offsetWidth },
      slots[i] ?? 0,
      { width: walker.offsetWidth, height: walker.offsetHeight },
    );
    if (jump) walker.style.transition = "none";
    walker.style.transform = `translate(${x}px,${y}px)`;
    if (jump) {
      void walker.offsetWidth;
      walker.style.transition = "";
    }
    walker.dataset.placed = "";
  });
}

/**
 * Projects the focused cell into the panel. The light is switched on at the
 * cell and sweeps across to the panel, like a projector.
 */
function project(el: Elements, focus: number | null, animate: boolean) {
  const { stage, light, projector, panel } = el;
  const cell = focus == null ? null : el.cells[focus];
  if (!projector) return;
  if (!stage || !light || !cell || !panel) {
    delete projector.dataset.on;
    return;
  }
  const geometry = projection(box(stage), box(cell), box(panel), matchMedia(STACKED).matches);
  const [quad, ...edges] = projector.children;
  quad?.setAttribute("points", geometry.points);
  edges.forEach((edge, i) => {
    const line = geometry.edges[i];
    if (!line) return;
    for (const [name, value] of Object.entries(line)) edge.setAttribute(name, String(value));
  });
  projector.dataset.on = "";
  light.style.transition = "none";
  if (!animate) {
    light.style.clipPath = geometry.to;
    return;
  }
  light.style.clipPath = geometry.from;
  void getComputedStyle(light).clipPath;
  light.style.transition = "clip-path 0.5s var(--ease-io)";
  light.style.clipPath = geometry.to;
}

/**
 * Runs the hero picture. The page renders the finished picture, which is what
 * reduced motion keeps; otherwise the board empties to a few cells and fills
 * again on a loop: a tool lights, a document runs to the node and on to a cell,
 * walkers step between filled cells, and the cell a person stops on opens in
 * the panel. The loop waits while the picture is off screen.
 */
export function useHeroPicture(toolCount: number) {
  const [board, dispatch] = useReducer(boardReducer, toolCount, settledBoard);
  const [beams, setBeams] = useState<Beams | null>(null);
  const [inViewRef, inView] = useInView<HTMLDivElement>();

  const [{ el, attach }] = useState(createElements);

  // The timeline reads the latest state between renders.
  const boardNow = useRef(board);
  const inViewNow = useRef(inView);
  const jumpNext = useRef(true);
  const animateFocus = useRef(false);
  useEffect(() => {
    boardNow.current = board;
    inViewNow.current = inView;
  });

  const stage = useCallback(
    (element: HTMLDivElement | null) => {
      attach.stageRef(element);
      inViewRef(element);
    },
    [attach, inViewRef],
  );

  useLayoutEffect(() => {
    placeWalkers(el, board.at, jumpNext.current);
    jumpNext.current = false;
  }, [el, board.at]);

  useLayoutEffect(() => {
    project(el, board.focus, animateFocus.current);
  }, [el, board.focus]);

  // Each run is a short dash travelling the length of its beam.
  useLayoutEffect(() => {
    for (const path of [...el.feeds, el.toBoard]) {
      if (!path) continue;
      const length = path.getTotalLength();
      const { dash, dashArray } = beamDash(length);
      path.dataset.dash = String(dash);
      path.dataset.length = String(length);
      path.style.strokeDasharray = dashArray;
    }
  }, [el, beams]);

  useEffect(() => {
    const reduced = matchMedia(REDUCED).matches;
    const pace = (ms: number) => (reduced ? 0 : ms);
    const timers = new Set<number>();
    const animations = new Set<Animation>();
    const busy = new Set<number>();
    let queue: FeedEvent[] = [];
    let ticks = 0;
    let reveal: number | undefined;
    let live = true;

    const later = (run: () => void, ms: number) => {
      const id = window.setTimeout(() => {
        timers.delete(id);
        run();
      }, ms);
      timers.add(id);
      return id;
    };
    const play = (element: Element | null | undefined, keyframes: Keyframe[], options: KeyframeAnimationOptions) => {
      const animation = element?.animate(keyframes, options);
      if (!animation) return null;
      animations.add(animation);
      animation.addEventListener("finish", () => animations.delete(animation));
      return animation;
    };
    const hit = (cell: number) =>
      play(el.cells[cell], HIT_KEYFRAMES, { duration: TIMING.hit, easing: "ease" });
    const run = (path: SVGPathElement | null | undefined, duration: number) =>
      path?.dataset.length
        ? play(path, runKeyframes(Number(path.dataset.dash), Number(path.dataset.length)), {
            duration,
            easing: BEAM_EASING,
          })
        : null;

    function layout() {
      const stageBox = el.stage && box(el.stage);
      const nodeEl = el.node;
      const sheetEl = el.sheet;
      if (!live || !stageBox?.width || !nodeEl || !sheetEl) return;
      const toolBoxes = el.tools.flatMap((tool) => (tool ? [relativeTo(stageBox, box(tool))] : []));
      const paths = beamPaths(
        toolBoxes,
        relativeTo(stageBox, box(nodeEl)),
        relativeTo(stageBox, box(sheetEl)),
        matchMedia(STACKED).matches,
      );
      setBeams(paths);
      busy.clear();
      placeWalkers(el, boardNow.current.at, true);
      project(el, boardNow.current.focus, false);
    }

    function open(cell: number) {
      dispatch({ type: "close" });
      clearTimeout(reveal);
      later(() => {
        dispatch({ type: "focus", cell });
        reveal = later(() => dispatch({ type: "reveal" }), pace(TIMING.reveal));
      }, pace(TIMING.close));
    }

    function step() {
      const plan = planStep(boardNow.current, Math.random);
      if (!plan) return;
      dispatch({ type: "move", at: plan.at });
      later(() => {
        hit(plan.to);
        if (plan.person && plan.to !== boardNow.current.focus) open(plan.to);
      }, pace(TIMING.arrive));
    }

    /** A document leaves a tool, passes through the node, and lands in a cell (or joins a filled one). */
    function feed(event: FeedEvent) {
      const stacked = matchMedia(STACKED).matches;
      const free = Array.from({ length: toolCount }, (_, tool) => tool).filter(
        (tool) => !busy.has(beamOf(tool, stacked)),
      );
      if (!free.length || !el.toBoard?.dataset.length) {
        queue.push(event);
        return;
      }
      const plan = planFeed(boardNow.current, event, free, Math.random);
      if (!plan) return;
      const beam = beamOf(plan.tool, stacked);
      busy.add(beam);
      dispatch({ type: "light", tool: plan.tool, on: true });
      const toNode = run(el.feeds[beam], TIMING.feed);
      if (!toNode) return;
      toNode.onfinish = () => {
        busy.delete(beam);
        dispatch({ type: "light", tool: plan.tool, on: false });
        play(el.ping, PING_KEYFRAMES, { duration: TIMING.ping, easing: "ease-out" });
        const down = run(el.toBoard, TIMING.toBoard);
        if (!down) return;
        down.onfinish = () => {
          dispatch({ type: "land", cell: plan.cell, tool: plan.tool });
          hit(plan.cell);
        };
      };
    }

    function reset() {
      const round = planRound(Math.random, toolCount);
      queue = round.queue;
      ticks = 0;
      jumpNext.current = true;
      dispatch({ type: "reset", landed: round.landed, at: round.at });
      open(round.at[0]!);
    }

    function tick() {
      if (!inViewNow.current || document.hidden) {
        later(tick, TIMING.idle);
        return;
      }
      if (!queue.length) {
        later(() => {
          dispatch({ type: "fade", on: true });
          later(() => {
            reset();
            dispatch({ type: "fade", on: false });
            later(tick, TIMING.afterReset);
          }, TIMING.fade);
        }, TIMING.rest);
        return;
      }
      // A document every other beat; a step every beat.
      const next = ++ticks % 2 === 0 ? queue.shift() : undefined;
      if (next !== undefined) feed(next);
      step();
      later(tick, TIMING.tick + Math.random() * TIMING.tickJitter);
    }

    layout();
    void document.fonts?.ready.then(layout);
    let resizing: number | undefined;
    const onResize = () => {
      clearTimeout(resizing);
      resizing = later(layout, TIMING.relayout);
    };
    addEventListener("resize", onResize);

    if (!reduced) {
      animateFocus.current = true;
      reset();
      later(tick, TIMING.firstTick);
    }

    return () => {
      live = false;
      removeEventListener("resize", onResize);
      for (const id of timers) clearTimeout(id);
      for (const animation of animations) animation.cancel();
    };
  }, [el, toolCount]);

  return { board, beams, ...attach, stageRef: stage };
}
