import { cssMs, rootToken } from "@/lib/css-time";

/**
 * A showcase stage's motion, as scripted animations, so its transforms and
 * blurs apply whatever else styles the element. The demo stages move their
 * recordings with it, and the harness showcase its pictures, the same way. Every number is a token in
 * styles/tokens.css. Each animation holds its first frame through its delay,
 * then lets the element's own style take over at its end.
 */

/** The pose something arrives from or leaves to: faded, blurred, moved down and scaled. */
const pose = (blur: string, down: string, scale = "1") => ({
  opacity: 0,
  filter: `blur(${blur})`,
  transform: `translateY(${down}) scale(${scale})`,
});
const atRest = { opacity: 1, filter: "blur(0px)", transform: "none" };

/**
 * The entry, in two beats: the stage's frame rises into place, then its
 * recording inside it. Resolves once both are in place, run to their end or
 * cut short.
 */
export function enterStage(stage: HTMLElement, recording: HTMLElement | null): Promise<unknown> {
  const ease = rootToken("--ease-out");
  const frame = stage.animate([pose(rootToken("--blur-stage-entry"), rootToken("--spacing-stage-rise"), rootToken("--scale-stage-entry")), atRest], {
    duration: cssMs(rootToken("--duration-stage-entry")),
    easing: ease,
    fill: "backwards",
  });
  const inner = recording?.animate([pose(rootToken("--blur-recording-entry"), rootToken("--spacing-recording-entry-rise")), atRest], {
    duration: cssMs(rootToken("--duration-recording-entry")),
    delay: cssMs(rootToken("--delay-recording-entry")),
    easing: ease,
    fill: "backwards",
  });
  return Promise.allSettled([frame.finished, inner?.finished]);
}

/** How long after the entry starts the caption's words begin to arrive, in ms: with the recording. */
export const entryCaptionDelay = () => cssMs(rootToken("--delay-recording-entry"));

/** A tab change: the new recording rises out of a blur, just after the old one starts to go. */
export function arriveRecording(recording: HTMLElement) {
  recording.animate(
    [pose(rootToken("--blur-recording-arrive"), rootToken("--spacing-recording-rise"), rootToken("--scale-recording-arrive")), atRest],
    {
      duration: cssMs(rootToken("--duration-recording-arrive")),
      delay: cssMs(rootToken("--delay-recording-arrive")),
      easing: rootToken("--ease-out"),
      fill: "backwards",
    },
  );
}

/**
 * A tab change: the old recording sinks and blurs away from wherever its own
 * arrival had got to. The animation ends, or is cut short, once it is gone.
 */
export function leaveRecording(recording: HTMLElement): Animation {
  const { opacity, filter, transform } = getComputedStyle(recording);
  for (const animation of recording.getAnimations()) animation.cancel();
  return recording.animate(
    [
      { opacity, filter: filter === "none" ? "blur(0px)" : filter, transform },
      pose(rootToken("--blur-recording-leave"), rootToken("--spacing-recording-sink"), rootToken("--scale-recording-leave")),
    ],
    { duration: cssMs(rootToken("--duration-recording-leave")), easing: rootToken("--ease-recording-leave"), fill: "forwards" },
  );
}
