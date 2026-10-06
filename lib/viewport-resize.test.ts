import { describe, expect, it } from "vitest";
import { onResize, widthChange, type ResizeTarget } from "./viewport-resize";

describe("widthChange", () => {
  it("passes over a resize that leaves the width as it was, as a toolbar hiding does", () => {
    const changed = widthChange(375);
    expect(changed(375)).toBe(false);
    expect(changed(375)).toBe(false);
  });

  it("tells each change of width, measured against the width it last saw", () => {
    const changed = widthChange(375);
    expect(changed(812)).toBe(true);
    expect(changed(812)).toBe(false);
    expect(changed(375)).toBe(true);
    expect(changed(375)).toBe(false);
  });
});

/** A window that can be resized by hand. */
function fakeWindow(width: number) {
  const events = new EventTarget();
  const target = {
    innerWidth: width,
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
  };
  const resize = (to: number) => {
    target.innerWidth = to;
    events.dispatchEvent(new Event("resize"));
  };
  return { target: target as unknown as ResizeTarget, resize };
}

describe("onResize", () => {
  it("tells the listener, on each resize, whether the width changed", () => {
    const { target, resize } = fakeWindow(375);
    const heard: boolean[] = [];
    onResize((widthChanged) => heard.push(widthChanged), target);
    resize(375);
    resize(812);
    resize(812);
    expect(heard).toEqual([false, true, false]);
  });

  it("stops listening when asked", () => {
    const { target, resize } = fakeWindow(375);
    const heard: boolean[] = [];
    const stop = onResize((widthChanged) => heard.push(widthChanged), target);
    stop();
    resize(812);
    expect(heard).toEqual([]);
  });
});
