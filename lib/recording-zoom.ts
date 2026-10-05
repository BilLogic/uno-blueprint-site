/*
 * A recording that zooms with its action: a timeline of keyframes, read
 * against the video's own clock, says how far in it is and where it looks.
 * The loop that applies it is in components/showcase/Recording.tsx.
 */
import { easeInOut } from "./glide";

/** One moment of a zoom timeline. */
export type ZoomKeyframe = {
  /** Seconds into the recording. */
  at: number;
  /** 1 shows the whole frame; 2 shows it twice as large. */
  scale: number;
  /** The point in focus, as a fraction of the frame's width and height (0 to 1). */
  x: number;
  y: number;
};

export type Zoom = Omit<ZoomKeyframe, "at">;

const WHOLE: Zoom = { scale: 1, x: 0.5, y: 0.5 };

const zoomOf = ({ scale, x, y }: ZoomKeyframe): Zoom => ({ scale, x, y });

/**
 * The zoom `time` seconds in. Between two keyframes it eases in and out; two
 * equal keyframes hold. Before the first and after the last it holds those.
 */
export function zoomAt(keyframes: readonly ZoomKeyframe[], time: number): Zoom {
  const first = keyframes[0];
  const last = keyframes.at(-1);
  if (!first || !last) return WHOLE;
  if (time <= first.at) return zoomOf(first);
  if (time >= last.at) return zoomOf(last);
  const next = keyframes.findIndex((keyframe) => keyframe.at > time);
  const [from, to] = [keyframes[next - 1]!, keyframes[next]!];
  const p = easeInOut((time - from.at) / (to.at - from.at));
  const mix = (a: number, b: number) => a + (b - a) * p;
  return { scale: mix(from.scale, to.scale), x: mix(from.x, to.x), y: mix(from.y, to.y) };
}

const percent = (value: number) => Math.round(value * 1000) / 10;

/**
 * The CSS transform for a zoom, on a box centred in its stage and scaled from
 * its own centre: the focus point moves to the box's centre, so the stage's.
 */
export function zoomTransform({ scale, x, y }: Zoom): string {
  return `translate(${percent(-scale * (x - 0.5)) || 0}%, ${percent(-scale * (y - 0.5)) || 0}%) scale(${scale})`;
}
