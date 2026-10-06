"use client";

import { useLayoutEffect, useRef, type RefObject } from "react";
import { REDUCED_MOTION_QUERY } from "@/hooks/use-media-query";
import { cssMs } from "@/lib/css-time";

type SwapParts = {
  /** The stage. Its recording is the child marked `data-recording`. */
  stage: RefObject<HTMLElement | null>;
  /** An empty box on the stage, under the recording, that holds what is leaving. */
  leaving: RefObject<HTMLElement | null>;
  /** The caption under the stage. */
  caption: RefObject<HTMLElement | null>;
};

/** The swap's duration, curves and rise, read from the tokens in styles/tokens.css. */
function timing() {
  const style = getComputedStyle(document.documentElement);
  const token = (name: string) => style.getPropertyValue(name).trim();
  return {
    duration: cssMs(token("--duration-recording-swap")),
    arrive: token("--ease-out"),
    glide: token("--ease-io"),
    rise: token("--spacing-recording-rise"),
  };
}

/**
 * A still of a recording as it leaves: a copy of its layer with the video
 * swapped for the frame on screen, or for its poster if no frame has been
 * drawn yet. It has no video of its own, so nothing more loads or plays.
 */
function still(layer: HTMLElement, video: HTMLVideoElement | null): HTMLElement {
  const copy = layer.cloneNode(true) as HTMLElement;
  for (const marked of [copy, ...copy.querySelectorAll("[data-testid], [data-recording]")]) {
    marked.removeAttribute("data-testid");
    marked.removeAttribute("data-recording");
  }
  copy.setAttribute("data-leaving", "");
  const player = copy.querySelector("video");
  if (!player || !video) return copy;
  let frame: HTMLElement;
  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth) {
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    frame = canvas;
  } else if (video.getAttribute("poster")) {
    const poster = document.createElement("img");
    poster.alt = "";
    poster.src = video.getAttribute("poster")!;
    frame = poster;
  } else {
    frame = document.createElement("div");
  }
  frame.className = player.className;
  frame.style.cssText = player.style.cssText;
  player.replaceWith(frame);
  return copy;
}

/**
 * The motion of a showcase's stage as its tab changes. Call the returned
 * function as the tab is picked, before the new tab renders. The outgoing
 * recording leaves as a still that fades out, while the incoming one fades
 * and rises in with its caption; on a phone, where the tabs' stages differ in
 * height, the stage glides from the one to the other. Each is a scripted
 * animation from the stage's state at that moment, so a tab picked
 * mid-change carries on from wherever the last one had got to: whatever was
 * still leaving goes at once, and the recording that was arriving leaves from
 * where it was. So there is never more than one still and one recording, and
 * only the recording plays. For a reader who asked for less motion, the tab
 * changes at once.
 *
 * The outgoing video stops loading as it goes, so the two recordings never
 * load together.
 */
export function useStageSwap(value: string, { stage, leaving, caption }: SwapParts): () => void {
  // The stage's height as the tab was picked, for the glide to start from.
  const from = useRef<number | null>(null);
  const glide = useRef<Animation | null>(null);
  const shown = useRef(value);

  const beforeSwap = () => {
    const node = stage.current;
    if (!node) return;
    from.current = node.getBoundingClientRect().height;
    const layer = node.querySelector<HTMLElement>("[data-recording]");
    const video = layer?.querySelector("video") ?? null;
    const box = leaving.current;
    if (layer && box && !matchMedia(REDUCED_MOTION_QUERY).matches) {
      for (const old of box.children) for (const animation of old.getAnimations()) animation.cancel();
      box.replaceChildren();
      const ghost = still(layer, video);
      // From wherever its own arrival had got to.
      const { opacity, translate } = getComputedStyle(layer);
      ghost.style.translate = translate;
      box.append(ghost);
      const { duration, arrive } = timing();
      ghost.animate([{ opacity }, { opacity: 0 }], { duration, easing: arrive, fill: "forwards" }).finished.then(
        () => ghost.remove(),
        () => {},
      );
    }
    if (video) {
      video.pause();
      video.removeAttribute("src");
      video.load();
    }
  };

  useLayoutEffect(() => {
    if (shown.current === value) return;
    shown.current = value;
    const node = stage.current;
    const start = from.current;
    from.current = null;
    glide.current?.cancel();
    glide.current = null;
    if (!node || matchMedia(REDUCED_MOTION_QUERY).matches) return;
    const { duration, arrive, glide: io, rise } = timing();
    const { width, height: end } = node.getBoundingClientRect();
    if (start !== null && Math.abs(start - end) >= 1) {
      // The width is held, or the stage's aspect ratio would take it from the height.
      glide.current = node.animate(
        [
          { width: `${width}px`, height: `${start}px` },
          { width: `${width}px`, height: `${end}px` },
        ],
        { duration, easing: io },
      );
    }
    const arrival = [
      { opacity: 0, translate: `0 ${rise}` },
      { opacity: 1, translate: "0 0" },
    ];
    node.querySelector<HTMLElement>("[data-recording]")?.animate(arrival, { duration, easing: arrive });
    caption.current?.animate(arrival, { duration, easing: arrive });
  }, [value, stage, caption]);

  return beforeSwap;
}
