import { describe, expect, it, vi } from "vitest";
import { site } from "@/content/site";
import { CLARITY_DELAY_MS, clarityIdFor, clarityLoader } from "./analytics";

describe("clarityIdFor", () => {
  it("loads Clarity only on a production deploy", () => {
    expect(clarityIdFor("production")).toBe(site.clarityId);
  });

  it("loads nothing on previews, branch deploys, CI and local builds", () => {
    for (const context of ["deploy-preview", "branch-deploy", "dev", "", undefined]) {
      expect(clarityIdFor(context)).toBeNull();
    }
  });
});

describe("clarityLoader", () => {
  it("requests the project's tag after load, on first input or a delay, when idle", () => {
    const script = clarityLoader("abc123");
    expect(script).toContain('"https://www.clarity.ms/tag/abc123"');
    expect(script).toMatch(/addEventListener\("load"/);
    expect(script).toContain(`setTimeout(g,${CLARITY_DELAY_MS})`);
    expect(script).toContain("requestIdleCallback");
  });

  it("parses as a script", () => {
    expect(() => new Function(clarityLoader(site.clarityId))).not.toThrow();
  });
});

/** Runs the loader against a stand-in window: listeners, timers and idle callbacks fire on demand. */
function runLoader(withIdle: boolean) {
  const listeners = new Map<string, Set<() => void>>();
  const appended: { src?: string }[] = [];
  const timers: (() => void)[] = [];
  const idles: (() => void)[] = [];
  const win: Record<string, unknown> = {};
  if (withIdle) win.requestIdleCallback = (fn: () => void) => idles.push(fn);
  const addEventListener = vi.fn((name: string, fn: () => void) => {
    if (!listeners.has(name)) listeners.set(name, new Set());
    listeners.get(name)!.add(fn);
  });
  const removeEventListener = vi.fn((name: string, fn: () => void) => listeners.get(name)?.delete(fn));
  const document = {
    createElement: () => ({}),
    head: { appendChild: (el: { src?: string }) => appended.push(el) },
  };
  const setTimeout = (fn: () => void) => timers.push(fn);
  new Function(
    "window",
    "document",
    "addEventListener",
    "removeEventListener",
    "setTimeout",
    "requestIdleCallback",
    clarityLoader("abc123"),
  )(win, document, addEventListener, removeEventListener, setTimeout, win.requestIdleCallback);
  // Events registered with { once: true } still stay in this stand-in, so a removal shows up.
  const fire = (name: string) => [...(listeners.get(name) ?? [])].forEach((fn) => fn());
  return { win, appended, timers, idles, listeners, fire };
}

describe("running the Clarity loader", () => {
  it("queues calls before the tag arrives", () => {
    const { win } = runLoader(true);
    (win.clarity as (...a: unknown[]) => void)("event", "x");
    expect((win.clarity as { q: unknown[][] }).q).toHaveLength(1);
  });

  it("requests nothing before the load event", () => {
    const { appended, fire, timers } = runLoader(true);
    fire("scroll");
    expect(timers).toEqual([]);
    expect(appended).toEqual([]);
  });

  it("appends the tag once, however many inputs and the timer fire, and drops its input listeners", () => {
    const { appended, fire, timers, idles, listeners } = runLoader(true);
    fire("load");
    fire("scroll");
    fire("pointerdown");
    fire("keydown");
    timers.forEach((fn) => fn());
    expect(appended).toEqual([]);
    idles.forEach((fn) => fn());
    expect(appended).toEqual([{ async: true, src: "https://www.clarity.ms/tag/abc123" }]);
    for (const name of ["scroll", "pointerdown", "keydown"]) expect(listeners.get(name)?.size ?? 0).toBe(0);
  });

  it("appends the tag on the timer alone, without requestIdleCallback", () => {
    const { appended, fire, timers } = runLoader(false);
    fire("load");
    timers.forEach((fn) => fn());
    timers.forEach((fn) => fn());
    expect(appended).toHaveLength(1);
  });
});
