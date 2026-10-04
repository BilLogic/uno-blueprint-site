"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/hooks/use-media-query";
import { useScrollStep, type Morph, type StepChange } from "@/hooks/use-scroll-step";
import {
  STAGE_WIDTH,
  STEP,
  CAPTION_GAP,
  TIMING,
  beamClip,
  availableStageHeight,
  cellBeat,
  fitStage,
  flatLift,
  poseOf,
  poseTransform,
  scrollLength as scrollLengthFor,
  stackLayers,
  stickyTopFor,
  type StageFit,
} from "@/lib/walkthrough";
import {
  CARD_PLACES,
  CARD_STYLE_NAMES,
  cardStyles,
  morphFrame,
  type CardRest,
  type LayerBox,
} from "@/lib/walkthrough-morph";

/** The caption's height before it is measured, as the prototype assumes. */
const CAPTION_FALLBACK = 110;
/** The beam meets the panel this far inside its top and bottom edges, in stage px. */
const BEAM_INSET = 18;

/** A point's position in stage px, read at whatever scale the stage has at this instant. */
function stagePoint(element: Element, world: DOMRect): [number, number] {
  const rect = element.getBoundingClientRect();
  const scale = world.width / STAGE_WIDTH || 1;
  return [(rect.left - world.left) / scale, (rect.top - world.top) / scale];
}

/** How the stage is laid out at this width: a phone frame or not, and the flat board's lift (see `flatLift`). */
export type StageLayout = { narrow: boolean; lift: number };

function setLine(line: Element | undefined, [x1, y1]: readonly number[], [x2, y2]: readonly number[]) {
  if (!line) return;
  line.setAttribute("x1", String(x1));
  line.setAttribute("y1", String(y1));
  line.setAttribute("x2", String(x2));
  line.setAttribute("y2", String(y2));
}

/**
 * Drives the structure walkthrough: which step shows, from the scroll; how
 * the stage is sized and posed; and what is measured rather than laid out
 * (the projection lines between sheets, the lines between lanes, and the beam
 * from the picked cell to its panel).
 *
 * The stage is scaled to what the viewport leaves under the headline, the
 * headline and frame are held together in the middle of the screen, and the
 * section gets the scroll length its steps add up to (a little less on a
 * desktop). The opening cards are drawn here, wherever their morph into the
 * stack has got to, and re-measured on a resize. Arriving at the cell from
 * above, it lights on the flat board and opens `TIMING.cellBeat` later; `open`
 * says whether it has. With reduced motion nothing is pinned and the last step
 * shows, open.
 *
 * `edges` end each step (see `stepEdges`); `scrollLength` is their total in
 * viewport heights. Attach the returned refs to the matching elements.
 */
export function useWalkthrough(edges: readonly number[], scrollLength: number) {
  const scroller = useRef<HTMLDivElement>(null);
  const sticky = useRef<HTMLDivElement>(null);
  const head = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const world = useRef<HTMLDivElement>(null);
  const caption = useRef<HTMLDivElement>(null);

  const reduced = useReducedMotion();
  const morph = useRef<Morph>({ progress: 0, draw: () => {} });
  const change = useScrollStep(scroller, sticky, edges, reduced, morph);
  const { step, previous } = change;
  const [layout, setLayout] = useState<StageLayout>({ narrow: false, lift: 0 });
  // The step change whose cell beat has run out, so its cell may open.
  const [beatOver, setBeatOver] = useState<StepChange | null>(null);
  const beat = cellBeat(step, previous);
  const open = step >= STEP.open && (!beat || beatOver === change);
  const pose = poseOf(step, open);

  const fit = useRef<StageFit | null>(null);
  const currentPose = useRef(pose);
  const currentOpen = useRef(open);
  const beamEnds = useRef<[number, number]>([0, 0]);
  const placePose = useRef(() => {});
  const draw = useRef(() => {});
  const remorph = useRef(() => {});

  useLayoutEffect(() => {
    // The caption's first line, in px below the frame's top. Read from the layout, not the
    // rendered boxes: the caption's words slide in on every step.
    const captionLine = (): number | null => {
      const stageEl = stage.current;
      const first = caption.current?.firstElementChild;
      if (!stageEl || !(first instanceof HTMLElement)) return null;
      if (first.offsetParent === stageEl.offsetParent) return first.offsetTop - stageEl.offsetTop;
      return first.getBoundingClientRect().top - stageEl.getBoundingClientRect().top;
    };

    // On a phone the caption sits at the foot of the frame, and the pose is centred above its first line.
    placePose.current = () => {
      const worldEl = world.current;
      const fitted = fit.current;
      if (!worldEl || !fitted) return;
      const line = captionLine();
      const room = line === null ? fitted.height : line - CAPTION_GAP;
      worldEl.style.transform = poseTransform(fitted, currentPose.current, room);
    };

    const refit = () => {
      const scrollerEl = scroller.current;
      const stickyEl = sticky.current;
      const stageEl = stage.current;
      if (!scrollerEl || !stickyEl || !stageEl) return;
      const headEl = head.current;
      const headHeight = headEl ? headEl.offsetHeight + (parseFloat(getComputedStyle(headEl).marginBottom) || 0) : 0;
      const captionHeight = caption.current?.offsetHeight || CAPTION_FALLBACK;
      const fitted = fitStage(stageEl.clientWidth, availableStageHeight(innerHeight, headHeight, captionHeight), headHeight);
      fit.current = fitted;
      // Whole pixels, so everything below the section sits on the pixel grid.
      stageEl.style.height = `${Math.round(fitted.height)}px`;
      const lift = flatLift(fitted, captionLine() ?? fitted.height);
      setLayout((was) => (was.narrow === fitted.narrow && was.lift === lift ? was : { narrow: fitted.narrow, lift }));
      placePose.current();
      stickyEl.style.top = `${stickyTopFor(innerHeight, stickyEl.offsetHeight)}px`;
      scrollerEl.style.height = reduced
        ? "auto"
        : `calc(${scrollLengthFor(scrollLength, innerWidth)}vh + ${stickyEl.offsetHeight}px)`;
    };

    // The lines between lanes sit halfway between one lane and the next.
    const placeLaneLines = () => {
      const worldEl = world.current;
      if (!worldEl) return;
      const rows = [...worldEl.querySelectorAll<HTMLElement>("[data-row]")];
      worldEl.querySelectorAll<HTMLElement>("[data-line]").forEach((line, a) => {
        const above = rows[a];
        const below = rows[a + 1];
        if (!above || !below) return;
        line.style.top = `${(above.offsetTop + above.offsetHeight + below.offsetTop) / 2}px`;
      });
    };

    draw.current = () => {
      const worldEl = world.current;
      if (!worldEl) return;
      const box = worldEl.getBoundingClientRect();
      const sheets = [...worldEl.querySelectorAll("[data-sheet]")];
      const targets = [sheets[1], sheets[2], worldEl.querySelector("[data-board]")];
      // Each sheet's followed tile is joined, corner to corner, to the sheet below it.
      worldEl.querySelectorAll("[data-link]").forEach((group, i) => {
        const from = [...(sheets[i]?.querySelectorAll('[data-corner="tile"]') ?? [])];
        const to = [...(targets[i]?.querySelectorAll(':scope > [data-corner="sheet"]') ?? [])];
        [...group.children].forEach((line, j) => {
          const a = from[j];
          const b = to[j];
          if (a && b) setLine(line, stagePoint(a, box), stagePoint(b, box));
        });
      });

      // The beam: from the picked cell's right-hand corners to the panel's left edge.
      const panel = worldEl.querySelector("[data-panel]");
      const beam = worldEl.querySelector("[data-beam-shape]");
      const corner = (at: string) => worldEl.querySelector(`[data-corner="cell"][data-at="${at}"]`);
      const topRightEl = corner("top-right");
      const bottomRightEl = corner("bottom-right");
      if (!panel || !beam || !topRightEl || !bottomRightEl) return;
      const topRight = stagePoint(topRightEl, box);
      const bottomRight = stagePoint(bottomRightEl, box);
      const scale = box.width / STAGE_WIDTH || 1;
      const rect = panel.getBoundingClientRect();
      const x = (rect.left - box.left) / scale;
      const y1 = (rect.top - box.top) / scale + BEAM_INSET;
      const y2 = (rect.bottom - box.top) / scale - BEAM_INSET;
      const [shape, upper, lower] = [...beam.children];
      shape?.setAttribute("points", `${topRight} ${x},${y1} ${x},${y2} ${bottomRight}`);
      setLine(upper, topRight, [x, y1]);
      setLine(lower, bottomRight, [x, y2]);
      beamEnds.current = [topRight[0], x];
    };

    // Whether the frame is a phone's, as last fitted.
    const isNarrow = () => fit.current?.narrow ?? false;

    // The opening cards: where each rests and how big it is, and the six layers of the stack they become.
    let cards: CardRest[] = [];
    let layers: LayerBox[] = [];
    const cardEls = () => [...(world.current?.querySelectorAll<HTMLElement>("[data-card]") ?? [])];
    const atRest = (el: HTMLElement) => CARD_STYLE_NAMES.forEach((name) => el.style.removeProperty(name));
    const measureMorph = () => {
      const worldEl = world.current;
      if (!worldEl) return;
      const places = isNarrow() ? CARD_PLACES.narrow : CARD_PLACES.wide;
      cards = cardEls().map((el, i) => {
        atRest(el);
        const [x, y, r] = places[i]!;
        return { x, y, r, w: el.offsetWidth, h: el.offsetHeight };
      });
      const layerEls = [
        ...worldEl.querySelectorAll<HTMLElement>("[data-sheet]"),
        worldEl.querySelector<HTMLElement>("[data-board]"),
        worldEl.querySelector<HTMLElement>('[data-ghost="0"]'),
        worldEl.querySelector<HTMLElement>('[data-ghost="1"]'),
      ];
      const places3d = stackLayers(STEP.context);
      layers = layerEls.map((el, i) => ({
        x: el?.offsetLeft ?? 0,
        y: el?.offsetTop ?? 0,
        w: el?.offsetWidth ?? 0,
        h: el?.offsetHeight ?? 0,
        ...places3d[i]!,
      }));
    };
    morph.current.draw = (progress) => {
      const els = cardEls();
      const frames = morphFrame(progress, cards, layers, isNarrow());
      if (!frames.length) {
        els.forEach(atRest);
        return;
      }
      frames.forEach((frame, i) => {
        const style = els[i]?.style;
        if (!style) return;
        for (const [name, value] of Object.entries(cardStyles(frame))) style.setProperty(name, value);
      });
    };
    remorph.current = () => {
      measureMorph();
      morph.current.draw(morph.current.progress);
    };

    refit();
    placeLaneLines();
    draw.current();
    remorph.current();

    // Lines follow the sheets while they move, and settle again when each move ends.
    const worldEl = world.current;
    const onTransitionEnd = (event: TransitionEvent) => {
      if (event.propertyName === "transform" || event.propertyName === "top") draw.current();
    };
    worldEl?.addEventListener("transitionend", onTransitionEnd);

    let settle = 0;
    const onResize = () => {
      clearTimeout(settle);
      settle = window.setTimeout(() => {
        refit();
        remorph.current();
        placeLaneLines();
        draw.current();
        const beam = world.current?.querySelector<SVGElement>("[data-beam]");
        if (beam && currentOpen.current && !reduced) {
          beam.style.transition = "none";
          beam.style.clipPath = beamClip(beamEnds.current[1] + 1);
        }
      }, TIMING.resizeSettle);
    };
    addEventListener("resize", onResize);

    let alive = true;
    document.fonts?.ready.then(() => {
      if (!alive) return;
      refit();
      remorph.current();
      placeLaneLines();
      draw.current();
    });

    return () => {
      alive = false;
      clearTimeout(settle);
      removeEventListener("resize", onResize);
      worldEl?.removeEventListener("transitionend", onTransitionEnd);
    };
  }, [reduced, scrollLength]);

  // A phone frame rests the cards elsewhere and at another width: measure them again once it applies.
  useLayoutEffect(() => {
    remorph.current();
  }, [layout.narrow]);

  // Each step: pose the stage for it, then let the lines follow the sheets for as long as they move.
  useLayoutEffect(() => {
    currentPose.current = pose;
    placePose.current();
    if (reduced) {
      draw.current();
      return;
    }
    let frame = 0;
    const until = performance.now() + TIMING.follow;
    const follow = () => {
      draw.current();
      frame = performance.now() < until ? requestAnimationFrame(follow) : 0;
    };
    follow();
    return () => cancelAnimationFrame(frame);
  }, [step, pose, reduced]);

  // Arriving at the cell from above, it shows lit for a beat, then opens. Leaving it closes it at once.
  useEffect(() => {
    if (!beat) return;
    const timer = window.setTimeout(() => setBeatOver(change), TIMING.cellBeat);
    return () => clearTimeout(timer);
  }, [beat, change]);

  // The beam is switched on at the cell and sweeps right until it meets the panel, which then opens the same way.
  useEffect(() => {
    currentOpen.current = open;
    const beam = world.current?.querySelector<SVGElement>("[data-beam]");
    if (!beam) return;
    beam.style.transition = "none";
    if (!open) {
      beam.style.clipPath = "inset(0 100% 0 0)";
      return;
    }
    if (reduced) {
      draw.current();
      beam.style.clipPath = "none";
      return;
    }
    beam.style.clipPath = "inset(0 100% 0 0)";
    const timer = window.setTimeout(() => {
      draw.current();
      const [from, to] = beamEnds.current;
      beam.style.clipPath = beamClip(from);
      // Commit the start before the transition is set, so the sweep runs from it.
      void getComputedStyle(beam).clipPath;
      beam.style.transition = "clip-path var(--duration-shade) var(--ease-io)";
      beam.style.clipPath = beamClip(to + 1);
    }, TIMING.beamDelay);
    return () => clearTimeout(timer);
  }, [open, reduced]);

  return { refs: { scroller, sticky, head, stage, world, caption }, step, previous, open, layout };
}
