import { describe, expect, it, vi } from "vitest";
import { site } from "@/content/site";
import { CLARITY_OPT_OUT_KEY } from "./clarity-tag.mjs";
import { CLARITY_DELAY_MS, clarityChoice, clarityIdFor, clarityLoader } from "./analytics";

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

type Storage = "works" | "throws";

/**
 * Runs the loader against a stand-in window: listeners, timers and idle callbacks
 * fire on demand. The address, the stored mark, storage that throws (as some
 * private modes do) and navigator.webdriver are set per run.
 */
function runLoader(
  withIdle: boolean,
  { href = "https://site.test/", stored = null as string | null, storage = "works" as Storage, webdriver = false } = {},
) {
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
  const store = new Map<string, string>(stored === null ? [] : [[CLARITY_OPT_OUT_KEY, stored]]);
  const refuse = () => {
    throw new DOMException("The operation is insecure.", "SecurityError");
  };
  const localStorage =
    storage === "throws"
      ? { getItem: refuse, setItem: refuse, removeItem: refuse }
      : {
          getItem: (k: string) => store.get(k) ?? null,
          setItem: (k: string, v: string) => void store.set(k, v),
          removeItem: (k: string) => void store.delete(k),
        };
  const replaced: string[] = [];
  const history = { state: null, replaceState: (_s: unknown, _t: string, url: string) => replaced.push(url) };
  new Function(
    "window",
    "document",
    "addEventListener",
    "removeEventListener",
    "setTimeout",
    "requestIdleCallback",
    "location",
    "history",
    "localStorage",
    "navigator",
    clarityLoader("abc123"),
  )(
    win,
    document,
    addEventListener,
    removeEventListener,
    setTimeout,
    win.requestIdleCallback,
    { href },
    history,
    localStorage,
    { webdriver },
  );
  // Events registered with { once: true } still stay in this stand-in, so a removal shows up.
  const fire = (name: string) => [...(listeners.get(name) ?? [])].forEach((fn) => fn());
  /** Fires everything that leads to the tag, so `appended` says whether it would load. */
  const settle = () => {
    fire("load");
    timers.forEach((fn) => fn());
    idles.forEach((fn) => fn());
  };
  return { win, appended, timers, idles, listeners, fire, settle, store, replaced };
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

describe("clarityChoice", () => {
  const visit = { param: null, stored: null, webdriver: false };

  it("loads for an ordinary visitor", () => {
    expect(clarityChoice(visit)).toEqual({ store: "keep", load: true });
  });

  it("marks the browser and skips the visit on ?clarity=off", () => {
    expect(clarityChoice({ ...visit, param: "off" })).toEqual({ store: "off", load: false });
  });

  it("skips a browser already marked as ours", () => {
    expect(clarityChoice({ ...visit, stored: "off" })).toEqual({ store: "keep", load: false });
  });

  it("clears the mark and loads on ?clarity=on", () => {
    expect(clarityChoice({ ...visit, param: "on", stored: "off" })).toEqual({ store: "clear", load: true });
  });

  it("ignores any other value", () => {
    expect(clarityChoice({ ...visit, param: "maybe" })).toEqual({ store: "keep", load: true });
  });

  it("never loads in an automated browser, whatever the address says", () => {
    expect(clarityChoice({ ...visit, param: "on", webdriver: true }).load).toBe(false);
  });
});

describe("the loader's opt-out", () => {
  it("strips ?clarity= from the address, keeping the rest of it", () => {
    const { replaced } = runLoader(true, { href: "https://site.test/a?x=1&clarity=off#faq" });
    expect(replaced).toEqual(["/a?x=1#faq"]);
  });

  it("leaves an address without the parameter alone", () => {
    const { replaced } = runLoader(true, { href: "https://site.test/a?x=1#faq" });
    expect(replaced).toEqual([]);
  });

  it("remembers ?clarity=off, so a later visit without it stays out too", () => {
    const first = runLoader(true, { href: "https://site.test/?clarity=off" });
    first.settle();
    expect(first.store.get(CLARITY_OPT_OUT_KEY)).toBe("off");
    expect(first.appended).toEqual([]);

    const later = runLoader(true, { stored: first.store.get(CLARITY_OPT_OUT_KEY) ?? null });
    later.settle();
    expect(later.appended).toEqual([]);
  });

  it("forgets the mark on ?clarity=on and loads again", () => {
    const { store, appended, settle } = runLoader(true, { href: "https://site.test/?clarity=on", stored: "off" });
    settle();
    expect(store.has(CLARITY_OPT_OUT_KEY)).toBe(false);
    expect(appended).toHaveLength(1);
  });

  it("returns before defining the queue or adding a listener when it skips", () => {
    for (const options of [{ stored: "off" }, { webdriver: true }]) {
      const { win, listeners } = runLoader(true, options);
      expect(win.clarity).toBeUndefined();
      expect(listeners.size).toBe(0);
    }
  });

  it("loads as for an ordinary visitor, without throwing, when storage refuses", () => {
    const { appended, settle, replaced } = runLoader(true, {
      href: "https://site.test/?clarity=maybe",
      storage: "throws",
    });
    settle();
    expect(replaced).toEqual(["/"]);
    expect(appended).toHaveLength(1);
  });

  it("agrees with clarityChoice on every combination", () => {
    for (const param of [null, "off", "on", "maybe"])
      for (const stored of [null, "off"])
        for (const storage of ["works", "throws"] as Storage[])
          for (const webdriver of [false, true]) {
            const href = param === null ? "https://site.test/" : `https://site.test/?clarity=${param}`;
            const run = runLoader(true, { href, stored, storage, webdriver });
            run.settle();
            // Storage that refuses reads as no mark, which is what the loader sees.
            const expected = clarityChoice({ param, stored: storage === "throws" ? null : stored, webdriver });
            const label = JSON.stringify({ param, stored, storage, webdriver });
            expect(run.appended.length === 1, label).toBe(expected.load);
            if (storage === "works") {
              const mark = run.store.get(CLARITY_OPT_OUT_KEY) ?? null;
              const want = expected.store === "off" ? "off" : expected.store === "clear" ? null : stored;
              expect(mark, label).toBe(want);
            }
          }
  });
});
