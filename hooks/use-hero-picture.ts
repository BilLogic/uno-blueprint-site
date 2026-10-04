"use client";

import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState, type ActionDispatch } from "react";
import { useInView } from "./use-in-view";
import { hero } from "@/content/hero";
import {
  BEAM_EASING,
  FIELDS,
  FIELD_PING_EASING,
  FIELD_PING_KEYFRAMES,
  HIT_KEYFRAMES,
  PING_KEYFRAMES,
  TIMING,
  beamDash,
  beamOf,
  beamPaths,
  boardReducer,
  mayOpen,
  nextStatus,
  panelExpired,
  personOpens,
  planFeed,
  planRound,
  planStep,
  projection,
  rehome,
  relativeTo,
  runKeyframes,
  settledBoard,
  slotsOf,
  soloScale,
  walkerSpot,
  type Board,
  type BoardAction,
  type Clock,
  type FeedEvent,
  type Field,
  type Place,
} from "@/lib/hero-picture";

const REDUCED = "(prefers-reduced-motion: reduce)";
/** The picture stacks into one column at the prototype's (max-width:760px). */
const STACKED = "(max-width: 760px)";

/** The elements the picture measures and animates, filled in as they mount. */
type Elements = {
  stage: HTMLDivElement | null;
  node: HTMLElement | null;
  ping: HTMLElement | null;
  board: HTMLElement | null;
  sheet: HTMLElement | null;
  panel: HTMLElement | null;
  fields: Partial<Record<Field, HTMLElement | null>>;
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
    board: null,
    sheet: null,
    panel: null,
    fields: {},
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
    boardRef: (element: HTMLElement | null) => void (el.board = element),
    sheetRef: (element: HTMLElement | null) => void (el.sheet = element),
    statusRef: (element: HTMLElement | null) => void (el.fields.status = element),
    ownerRef: (element: HTMLElement | null) => void (el.fields.owner = element),
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

/** The element a walker stands on. */
function target(el: Elements, place: Place | null) {
  if (!place) return null;
  if (place.kind === "cell") return el.cells[place.cell] ?? null;
  if (place.kind === "tool") return el.tools[place.tool] ?? null;
  return el.fields[place.field] ?? null;
}

/** Stands each walker on its spot; `jump` skips the walk, as on a new round, a resize or while the board resizes. */
function placeWalkers(el: Elements, at: Board["at"], jump: boolean) {
  const { stage, panel } = el;
  if (!stage) return;
  const slots = slotsOf(at);
  // Every read before any write, so placing four walkers costs one layout.
  const stageBox = box(stage);
  const frame = { width: stage.offsetWidth, height: stage.offsetHeight };
  const spots = el.walkers.map((walker, i) => {
    const place = at[i] ?? null;
    const element = target(el, place);
    if (!walker || !element) return null;
    const panelRight = place?.kind === "field" && panel ? box(panel).right - stageBox.left : null;
    return walkerSpot(
      relativeTo(stageBox, box(element)),
      slots[i] ?? 0,
      { width: walker.offsetWidth, height: walker.offsetHeight },
      frame,
      panelRight,
    );
  });
  el.walkers.forEach((walker, i) => {
    const spot = spots[i];
    if (!walker || !spot) return;
    if (jump) walker.style.transition = "none";
    walker.style.transform = `translate(${spot.x}px,${spot.y}px)`;
    walker.dataset.placed = "";
    // What it stands on (cell, tool or field), for the behaviour tests.
    walker.dataset.on = at[i]?.kind ?? "";
  });
  if (!jump) return;
  void stage.offsetWidth;
  for (const walker of el.walkers) if (walker) walker.style.transition = "";
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
  const geometry = projection(box(stage), box(cell), box(panel));
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
  light.style.transition = "clip-path var(--duration-hero-sweep) var(--ease-io)";
  light.style.clipPath = geometry.to;
}

type Timeline = {
  el: Elements;
  dispatch: ActionDispatch<[BoardAction]>;
  toolCount: number;
  /** The latest state, read between renders. */
  board: () => Board;
  inView: () => boolean;
  setBeams: (beams: Beams) => void;
  /** Called before a new round lands, so the walkers jump to their first cells. */
  onRound: () => void;
};

const STATUSES = hero.picture.panel.statuses;

/**
 * The prototype's timeline, as timers. Measures the picture, then (without
 * reduced motion) empties the board to a few cells and fills it again on a
 * loop. Returns a function that stops everything it started.
 */
function startTimeline({ el, dispatch, toolCount, board, inView, setBeams, onRound }: Timeline) {
  const reduced = matchMedia(REDUCED).matches;
  const stacked = () => matchMedia(STACKED).matches;
  const timers = new Set<number>();
  const animations = new Set<Animation>();
  const busy = new Set<number>();
  const clock: Clock = { soloAt: 0, openSince: 0, lastOpen: -Infinity };
  const allTools = Array.from({ length: toolCount }, (_, tool) => tool);
  let queue: FeedEvent[] = [];
  let ticks = 0;
  let reveal: number | undefined;
  /** While the board resizes nobody sets off; `ride` keeps everything on it frame by frame. */
  let hold = false;
  let ride = 0;
  let frame: number | undefined;
  let lastBeams = "";

  const later = (run: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timers.delete(id);
      run();
    }, ms);
    timers.add(id);
    return id;
  };
  const track = (animation: Animation) => {
    animations.add(animation);
    animation.addEventListener("finish", () => animations.delete(animation));
    return animation;
  };
  const play = (element: Element | null | undefined, keyframes: Keyframe[], options: KeyframeAnimationOptions) =>
    element && track(element.animate(keyframes, options));
  const hit = (cell: number) => play(el.cells[cell], HIT_KEYFRAMES, { duration: TIMING.hit, easing: "ease" });
  const measured = (path: SVGPathElement | null | undefined): path is SVGPathElement => Boolean(path?.dataset.length);
  const run = (path: SVGPathElement, duration: number) =>
    track(
      path.animate(runKeyframes(Number(path.dataset.dash), Number(path.dataset.length)), { duration, easing: BEAM_EASING }),
    );

  /** The beams, the walkers and the projection, measured again where the picture now stands. */
  function measure() {
    const stageBox = el.stage && box(el.stage);
    if (!stageBox?.width || !el.node || !el.sheet) return false;
    const toolBoxes = el.tools.flatMap((tool) => (tool ? [relativeTo(stageBox, box(tool))] : []));
    const beams = beamPaths(toolBoxes, relativeTo(stageBox, box(el.node)), relativeTo(stageBox, box(el.sheet)), stacked());
    const key = JSON.stringify(beams);
    if (key !== lastBeams) {
      lastBeams = key;
      setBeams(beams);
    }
    placeWalkers(el, board().at, true);
    const { focus, projecting } = board();
    project(el, projecting ? focus : null, false);
    return true;
  }

  function layout() {
    if (!measure()) return;
    busy.clear();
    // A phone shows no panel: anyone standing in it goes back to the board.
    const at = rehome(board(), Math.random, !stacked());
    if (at) dispatch({ type: "move", at });
  }

  /** Keeps the walkers, the beams and the light on the board while it grows or shrinks. */
  function rideAlong(ms: number) {
    const id = ++ride;
    const end = performance.now() + ms;
    hold = true;
    if (frame !== undefined) cancelAnimationFrame(frame);
    const step = () => {
      frame = undefined;
      if (id !== ride) return;
      measure();
      if (performance.now() < end) frame = requestAnimationFrame(step);
      else hold = false;
    };
    step();
  }

  /** The board alone, larger, with the panel away; or the board giving the panel its room back. */
  function solo(on: boolean) {
    const now = performance.now();
    if (on) {
      clock.soloAt = now;
      clearTimeout(reveal);
      const { stage, board: picture, sheet, panel } = el;
      if (stage && picture && sheet && panel && !stacked()) {
        const scale = soloScale({
          board: picture.offsetWidth,
          gap: parseFloat(getComputedStyle(stage).columnGap) || 0,
          panel: panel.offsetWidth,
          stageHeight: stage.clientHeight,
          sheetHeight: sheet.offsetHeight,
        });
        stage.style.setProperty("--solo-scale", scale.toFixed(3));
      }
    } else clock.openSince = now;
    // The reducer walks anyone on the panel back to a cell before the board starts growing.
    dispatch(on ? { type: "solo", on, random: Math.random() } : { type: "solo", on });
    rideAlong(TIMING.ride);
  }

  /** The panel blanks, takes the new cell and the light sweeps to it, then the cell's details fill in. */
  function show(cell: number) {
    dispatch({ type: "close" });
    clearTimeout(reveal);
    later(() => {
      if (board().solo) return;
      dispatch({ type: "focus", cell });
      reveal = later(() => dispatch({ type: "reveal" }), TIMING.reveal);
    }, TIMING.close);
  }

  /** On a phone the hero is the board alone, so nothing opens there. */
  function open(cell: number) {
    const now = performance.now();
    if (stacked() || !mayOpen(clock, now)) return;
    clock.lastOpen = now;
    if (board().solo) {
      solo(false);
      later(() => show(cell), TIMING.unsolo);
      return;
    }
    show(cell);
  }

  function step() {
    if (hold) return;
    if (panelExpired(board().solo, clock, performance.now())) {
      solo(true);
      return;
    }
    const plan = planStep(board(), Math.random, { tools: allTools, fields: stacked() ? [] : FIELDS });
    if (!plan) return;
    dispatch({ type: "move", at: plan.at, carry: plan.carry });
    later(() => {
      const { to } = plan;
      if (to.kind === "tool") {
        dispatch({ type: "light", tool: to.tool, on: true });
        later(() => dispatch({ type: "light", tool: to.tool, on: false }), TIMING.toolLit);
        return;
      }
      if (to.kind === "field") {
        play(el.fields[to.field], FIELD_PING_KEYFRAMES, { duration: TIMING.ping, easing: FIELD_PING_EASING });
        const now = board();
        if (to.field === "status" && now.shown !== null) {
          const shown = now.status ?? now.shown % STATUSES.length;
          dispatch({ type: "restatus", status: nextStatus(shown, STATUSES, Math.random) });
        }
        return;
      }
      hit(to.cell);
      dispatch({ type: "drop", walker: plan.walker, cell: to.cell });
      const latest = board();
      if (plan.person && to.cell !== latest.focus && personOpens(latest.solo, clock, performance.now())) open(to.cell);
    }, TIMING.arrive);
  }

  /** A document leaves a tool, passes through the node, and lands in a cell (or joins a filled one). */
  function feed(event: FeedEvent) {
    const vertical = stacked();
    const free = allTools.filter(
      (tool) => !busy.has(beamOf(tool, vertical)) && measured(el.feeds[beamOf(tool, vertical)]),
    );
    const down = el.toBoard;
    if (!free.length || !measured(down)) {
      queue.push(event);
      return;
    }
    const plan = planFeed(board(), event, free, Math.random);
    if (!plan) return;
    const beam = beamOf(plan.tool, vertical);
    const path = el.feeds[beam]!;
    busy.add(beam);
    dispatch({ type: "light", tool: plan.tool, on: true });
    run(path, TIMING.feed).onfinish = () => {
      busy.delete(beam);
      dispatch({ type: "light", tool: plan.tool, on: false });
      play(el.ping, PING_KEYFRAMES, { duration: TIMING.ping, easing: "ease-out" });
      run(down, TIMING.toBoard).onfinish = () => {
        dispatch({ type: "land", cell: plan.cell, tool: plan.tool });
        hit(plan.cell);
      };
    };
  }

  /** A new round opens on the board alone. */
  function reset() {
    const round = planRound(Math.random, toolCount);
    queue = round.queue;
    ticks = 0;
    onRound();
    dispatch({ type: "reset", landed: round.landed, at: round.at });
    solo(true);
  }

  /** The board fades out and a new round starts. */
  function restart() {
    dispatch({ type: "fade", on: true });
    later(() => {
      reset();
      dispatch({ type: "fade", on: false });
      later(tick, TIMING.afterReset);
    }, TIMING.fade);
  }

  function tick() {
    if (!inView() || document.hidden) {
      later(tick, TIMING.idle);
      return;
    }
    if (!queue.length) {
      later(restart, TIMING.rest);
      return;
    }
    // A document every other beat; a step every beat.
    const next = ++ticks % 2 === 0 ? queue.shift() : undefined;
    if (next !== undefined) feed(next);
    step();
    later(tick, TIMING.tick + Math.random() * TIMING.tickJitter);
  }

  let live = true;
  let resizing: number | undefined;
  const onResize = () => {
    clearTimeout(resizing);
    resizing = later(layout, TIMING.relayout);
  };
  layout();
  void document.fonts?.ready.then(() => live && layout());
  addEventListener("resize", onResize);
  // The page arrives showing the finished board, so the first round starts the
  // way every later one does: the board fades and refills.
  if (!reduced) later(restart, TIMING.firstRound);

  return () => {
    live = false;
    ride++;
    if (frame !== undefined) cancelAnimationFrame(frame);
    removeEventListener("resize", onResize);
    for (const id of timers) clearTimeout(id);
    for (const animation of animations) animation.cancel();
  };
}

/**
 * Runs `start` a while after the page has loaded, at an idle moment, so the
 * picture's first measurements never hold up the page's first paints.
 */
function afterLoad(start: () => void) {
  let timer: number | undefined;
  let idle: number | undefined;
  const wait = () => {
    timer = window.setTimeout(() => {
      if (typeof requestIdleCallback === "function") idle = requestIdleCallback(start, { timeout: TIMING.startBy });
      else start();
    }, TIMING.afterLoad);
  };
  if (document.readyState === "complete") wait();
  else addEventListener("load", wait, { once: true });
  return () => {
    removeEventListener("load", wait);
    clearTimeout(timer);
    if (idle !== undefined) cancelIdleCallback(idle);
  };
}

/**
 * Runs the hero picture. The page renders the finished picture, which is what
 * reduced motion keeps; otherwise the board empties to a few cells and fills
 * again on a loop: a tool lights, a document runs to the node and on to a cell,
 * walkers step between filled cells, fetch sources from the tools and stop on
 * the panel's fields. Each round opens on the board alone; the first cell a
 * person stops on brings the panel back. The loop waits while the picture is
 * off screen.
 */
export function useHeroPicture(toolCount: number) {
  const [board, dispatch] = useReducer(boardReducer, toolCount, settledBoard);
  const [beams, setBeams] = useState<Beams | null>(null);
  const [inViewRef, inView] = useInView<HTMLDivElement>();
  const [{ el, attach }] = useState(createElements);

  // The timeline reads the latest state between renders.
  const boardNow = useRef(board);
  const inViewNow = useRef(inView);
  useEffect(() => {
    boardNow.current = board;
    inViewNow.current = inView;
  });
  /** Nothing is measured until the timeline starts, after the page has loaded. */
  const started = useRef(false);
  const jumpNext = useRef(true);

  const stage = useCallback(
    (element: HTMLDivElement | null) => {
      attach.stageRef(element);
      inViewRef(element);
    },
    [attach, inViewRef],
  );

  useLayoutEffect(() => {
    if (!started.current) return;
    placeWalkers(el, board.at, jumpNext.current);
    jumpNext.current = false;
    // A new status changes the pill's width, so a person standing on it steps to its new corner.
  }, [el, board.at, board.status]);

  useLayoutEffect(() => {
    if (!started.current) return;
    project(el, board.projecting ? board.focus : null, true);
  }, [el, board.focus, board.projecting]);

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
    let stop: (() => void) | undefined;
    const cancel = afterLoad(() => {
      started.current = true;
      stop = startTimeline({
        el,
        dispatch,
        toolCount,
        board: () => boardNow.current,
        inView: () => inViewNow.current,
        setBeams,
        onRound: () => {
          jumpNext.current = true;
        },
      });
    });
    return () => {
      cancel();
      stop?.();
      started.current = false;
    };
  }, [el, toolCount]);

  return { board, beams, ...attach, stageRef: stage };
}
