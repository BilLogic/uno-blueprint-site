import { afterEach, describe, expect, it } from "vitest";
import {
  easeInOut,
  glideDuration,
  glideEnd,
  glideJumps,
  inPageTarget,
  isGliding,
  onGlidePath,
  setGliding,
} from "./glide";

describe("glideDuration", () => {
  const screen = 1000;

  it("takes at least 650 ms, however short the trip", () => {
    expect(glideDuration(10, screen)).toBe(650);
    expect(glideDuration(-10, screen)).toBe(650);
  });

  it("grows with the trip, by 170 ms a screen on top of 520 ms", () => {
    expect(glideDuration(2000, screen)).toBe(860);
    expect(glideDuration(-2000, screen)).toBe(860);
  });

  it("never takes more than 1600 ms", () => {
    expect(glideDuration(7000, screen)).toBe(1600);
    expect(glideDuration(30000, screen)).toBe(1600);
  });
});

describe("easeInOut", () => {
  it("starts and ends at rest and passes the middle at half way", () => {
    expect(easeInOut(0)).toBe(0);
    expect(easeInOut(0.5)).toBe(0.5);
    expect(easeInOut(1)).toBe(1);
  });

  it("eases in, then out", () => {
    expect(easeInOut(0.25)).toBeCloseTo(0.0625);
    expect(easeInOut(0.75)).toBeCloseTo(0.9375);
  });
});

describe("glideEnd", () => {
  it("stops where the page can scroll to", () => {
    expect(glideEnd(500, 4000)).toBe(500);
    expect(glideEnd(-30, 4000)).toBe(0);
    expect(glideEnd(5000, 4000)).toBe(4000);
  });
});

describe("glideJumps", () => {
  it("jumps for a reader who asked for less motion", () => {
    expect(glideJumps(3000, true)).toBe(true);
  });

  it("jumps a trip too short to see", () => {
    expect(glideJumps(1.5, false)).toBe(true);
    expect(glideJumps(-1.5, false)).toBe(true);
  });

  it("glides otherwise", () => {
    expect(glideJumps(2, false)).toBe(false);
  });
});

describe("onGlidePath", () => {
  const screen = 800;
  const pin = { top: 1000, bottom: 5000 };

  it("holds a pinned section the trip passes through", () => {
    expect(onGlidePath(pin, 0, 6000, screen)).toBe(true);
    expect(onGlidePath(pin, 6000, 0, screen)).toBe(true);
  });

  it("holds one the trip starts or ends inside", () => {
    expect(onGlidePath(pin, 2000, 7000, screen)).toBe(true);
  });

  it("holds one whose top is within a screen below the end of the trip", () => {
    expect(onGlidePath(pin, 0, 201, screen)).toBe(true);
  });

  it("leaves one the trip never comes near", () => {
    expect(onGlidePath(pin, 0, 200, screen)).toBe(false);
    expect(onGlidePath(pin, 5000, 9000, screen)).toBe(false);
  });
});

describe("inPageTarget", () => {
  it("names the element a link within the page points at", () => {
    expect(inPageTarget("#start")).toBe("start");
  });

  it("names nothing for a bare hash or a link elsewhere", () => {
    expect(inPageTarget("#")).toBeNull();
    expect(inPageTarget("https://example.com/#start")).toBeNull();
    expect(inPageTarget(null)).toBeNull();
  });
});

describe("the glide signal", () => {
  afterEach(() => setGliding(false));

  it("is off until a glide starts, and off again once it ends", () => {
    expect(isGliding()).toBe(false);
    setGliding(true);
    expect(isGliding()).toBe(true);
    setGliding(false);
    expect(isGliding()).toBe(false);
  });
});
