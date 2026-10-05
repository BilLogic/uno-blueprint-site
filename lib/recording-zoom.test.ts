import { describe, expect, it } from "vitest";
import { zoomAt, zoomTransform, type ZoomKeyframe } from "./recording-zoom";

const whole = { scale: 1, x: 0.5, y: 0.5 };
const keyframes: readonly ZoomKeyframe[] = [
  { at: 1, ...whole },
  { at: 2, scale: 2, x: 0.3, y: 0.7 },
  { at: 4, scale: 2, x: 0.3, y: 0.7 },
  { at: 6, ...whole },
];

describe("zoomAt", () => {
  it("holds the first keyframe before it", () => {
    expect(zoomAt(keyframes, 0)).toEqual(whole);
    expect(zoomAt(keyframes, 1)).toEqual(whole);
  });

  it("holds the last keyframe after it", () => {
    expect(zoomAt(keyframes, 6)).toEqual(whole);
    expect(zoomAt(keyframes, 60)).toEqual(whole);
  });

  it("lands on each keyframe exactly", () => {
    expect(zoomAt(keyframes, 2)).toEqual({ scale: 2, x: 0.3, y: 0.7 });
  });

  it("eases in and out between keyframes: halfway in time is halfway in value", () => {
    const mid = zoomAt(keyframes, 1.5);
    expect(mid.scale).toBeCloseTo(1.5);
    expect(mid.x).toBeCloseTo(0.4);
    expect(mid.y).toBeCloseTo(0.6);
  });

  it("starts and ends a move slowly", () => {
    // A quarter of the way in time, an ease-in-out has covered less than a quarter of the way.
    expect(zoomAt(keyframes, 1.25).scale - 1).toBeLessThan(0.25);
    expect(2 - zoomAt(keyframes, 1.75).scale).toBeLessThan(0.25);
  });

  it("holds between two equal keyframes", () => {
    expect(zoomAt(keyframes, 3)).toEqual({ scale: 2, x: 0.3, y: 0.7 });
  });

  it("is the whole phone without keyframes", () => {
    expect(zoomAt([], 3)).toEqual(whole);
  });
});

describe("zoomTransform", () => {
  it("leaves the whole phone where it is", () => {
    expect(zoomTransform(whole)).toBe("translate(0%, 0%) scale(1)");
  });

  it("scales and brings the focus point to the centre", () => {
    // The focus sits a quarter of the phone left of centre and a fifth below it; scaled twice, that is half and two fifths.
    expect(zoomTransform({ scale: 2, x: 0.25, y: 0.7 })).toBe("translate(50%, -40%) scale(2)");
  });
});
