import { cssMs, rootToken } from "@/lib/css-time";

/**
 * A showcase stage's motion, as scripted animations, so its transforms and
 * blurs apply whatever else styles the element. What moves inside the stage
 * is a layer: a recording on the demo stages, a picture on the harness
 * showcase. Every number is a token in styles/tokens.css. Each animation
 * holds its first frame through its delay, then lets the element's own style
 * take over at its end.
 */

/** The pose something arrives from or leaves to: faded, blurred, moved down and scaled. */
const pose = (blur: string, down: string, scale = "1") => ({
  opacity: 0,
  filter: `blur(${blur})`,
  transform: `translateY(${down}) scale(${scale})`,
});
const atRest = { opacity: 1, filter: "blur(0px)", transform: "none" };

/**
 * The entry, in two beats: the stage's frame rises into place, then the
 * layer inside it. Resolves once both are in place, run to their end or cut
 * short.
 */
export function enterStage(stage: HTMLElement, layer: HTMLElement | null): Promise<unknown> {
  const ease = rootToken("--ease-out");
  const frame = stage.animate([pose(rootToken("--blur-stage-entry"), rootToken("--spacing-stage-rise"), rootToken("--scale-stage-entry")), atRest], {
    duration: cssMs(rootToken("--duration-stage-entry")),
    easing: ease,
    fill: "backwards",
  });
  const inner = layer?.animate([pose(rootToken("--blur-layer-entry"), rootToken("--spacing-layer-entry-rise")), atRest], {
    duration: cssMs(rootToken("--duration-layer-entry")),
    delay: cssMs(rootToken("--delay-layer-entry")),
    easing: ease,
    fill: "backwards",
  });
  return Promise.allSettled([frame.finished, inner?.finished]);
}

/** How long after the entry starts the caption's words begin to arrive, in ms: with the layer. */
export const entryCaptionDelay = () => cssMs(rootToken("--delay-layer-entry"));

/** A tab change: the new layer rises out of a blur, just after the old one starts to go. */
export function arriveLayer(layer: HTMLElement) {
  layer.animate(
    [pose(rootToken("--blur-layer-arrive"), rootToken("--spacing-layer-rise"), rootToken("--scale-layer-arrive")), atRest],
    {
      duration: cssMs(rootToken("--duration-layer-arrive")),
      delay: cssMs(rootToken("--delay-layer-arrive")),
      easing: rootToken("--ease-out"),
      fill: "backwards",
    },
  );
}

/**
 * A tab change: the old layer sinks and blurs away from wherever its own
 * arrival had got to. The animation ends, or is cut short, once it is gone.
 */
export function leaveLayer(layer: HTMLElement): Animation {
  const { opacity, filter, transform } = getComputedStyle(layer);
  for (const animation of layer.getAnimations()) animation.cancel();
  return layer.animate(
    [
      { opacity, filter: filter === "none" ? "blur(0px)" : filter, transform },
      pose(rootToken("--blur-layer-leave"), rootToken("--spacing-layer-sink"), rootToken("--scale-layer-leave")),
    ],
    { duration: cssMs(rootToken("--duration-layer-leave")), easing: rootToken("--ease-layer-leave"), fill: "forwards" },
  );
}
