import { expect, test, type Locator, type Page } from "@playwright/test";
import { canvas } from "@/content/canvas";
import { touchPoints } from "@/content/touch-points";
import { FRAME, animationsDone, flushRenders, installClock, realFrames, runUntil, stopClockASecondOn, tick } from "./clock";

/** --duration-t-3, the entry's duration: a caption word's. */
const ENTRY_MS = 460;
/** --duration-recording-swap, a tab change's. */
const SWAP_MS = 300;

/**
 * Stands in for playback, which the test browser cannot decode: each video
 * records whether it was last told to play or pause.
 */
async function stubPlayback(page: Page) {
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = function () {
      this.dataset.state = "playing";
      return Promise.resolve();
    };
    HTMLMediaElement.prototype.pause = function () {
      this.dataset.state = "paused";
    };
  });
}

const sections = [
  { name: "canvas", headline: canvas.headline },
  { name: "touch points", headline: touchPoints.headline },
] as const;

const sectionOf = (page: Page, headline: string) =>
  page.locator("section", { has: page.getByRole("heading", { name: headline }) });

const stageIn = (section: Locator) => section.getByTestId("showcase-stage");
const panelIn = (section: Locator) => section.getByRole("tabpanel");
/** The recordings on the stage: the one showing, and the one leaving, if any. */
const layers = (stage: Locator) => stage.locator("[data-recording]");
const leaving = (stage: Locator) => stage.locator("[data-recording][data-leaving]");
const current = (stage: Locator) => stage.locator("[data-recording]:not([data-leaving])");
const playing = (stage: Locator) => stage.locator('video[data-state="playing"]');

/**
 * Brings the stage into view on a stopped page clock and lets its entry run:
 * the clock to the recording's start, the browser's own time to the
 * transition's end.
 */
async function enter(page: Page, stage: Locator) {
  await stage.scrollIntoViewIfNeeded();
  await realFrames(page);
  await flushRenders(page);
  await runUntil(page, async () => (await playing(stage).count()) === 1, { step: FRAME, limit: ENTRY_MS + 8 * FRAME });
  await animationsDone(stage);
}

/**
 * Pauses every animation in `root` at its first frame the moment the page
 * next adds or removes something in `root` (a picked tab mounts its recording
 * and caption afresh), before a frame is drawn, so the change can
 * be read mid-flight however fast the machine is. `seek` moves them on, and
 * `finishAll` runs them to their end.
 */
const freezeNextChange = (root: Locator) =>
  root.evaluate((node) => {
    const observer = new MutationObserver(() => {
      observer.disconnect();
      for (const animation of node.getAnimations({ subtree: true })) animation.pause();
    });
    observer.observe(node, { childList: true, subtree: true });
  });

const seek = (root: Locator, ms: number) =>
  root.evaluate((node, ms) => {
    for (const animation of node.getAnimations({ subtree: true })) if (animation.playState === "paused") animation.currentTime = ms;
  }, ms);

const finishAll = (root: Locator) =>
  root.evaluate((node) => {
    for (const animation of node.getAnimations({ subtree: true })) animation.finish();
  });

/** Picks a tab with the animations it starts held at their first frame. */
async function pickFrozen(page: Page, section: Locator, label: string) {
  await freezeNextChange(panelIn(section));
  await section.getByRole("tab", { name: label }).dispatchEvent("click");
  await flushRenders(page);
  await flushRenders(page);
}

/** An element's own animations, as their duration and keyframes. */
const motionOf = (element: Locator) =>
  element.evaluate((node) =>
    node.getAnimations().map((animation) => ({
      duration: Number(animation.effect?.getTiming().duration),
      keyframes: (animation.effect as KeyframeEffect).getKeyframes().map((frame) => ({ ...frame })),
    })),
  );

for (const section of sections) {
  test(`the ${section.name} stage enters once, the first time it comes into view, and its recording plays as it settles`, async ({
    page,
  }) => {
    await stubPlayback(page);
    await installClock(page);
    await page.goto("/");
    await stopClockASecondOn(page);
    const stage = stageIn(sectionOf(page, section.headline));
    const video = stage.locator("video");

    // Out of view, once the page is live, it waits: faded, lowered and blurred.
    await expect(stage).toHaveAttribute("data-entry", "waiting");
    await expect(stage).toHaveCSS("opacity", "0");
    await expect(stage).toHaveCSS("filter", /blur/);
    await expect(stage).toHaveCSS("translate", "0px 12px");

    // The transitions it runs are noted as they start, however soon they end.
    await stage.evaluate((node) => {
      node.addEventListener("transitionrun", (event) => {
        if (!(event instanceof TransitionEvent) || event.target !== node) return;
        node.dataset.ran = `${node.dataset.ran ?? ""} ${event.propertyName}`.trim();
      });
    });
    const ran = async () => ((await stage.getAttribute("data-ran")) ?? "").split(" ").sort();
    await stage.scrollIntoViewIfNeeded();
    await realFrames(page);
    await flushRenders(page);
    await expect(stage).toHaveAttribute("data-entry", "in");
    await expect.poll(ran).toEqual(["filter", "opacity", "translate"]);

    // The recording waits for the entry to have run, by the page's clock.
    await tick(page, ENTRY_MS - 4 * FRAME);
    await flushRenders(page);
    expect(await video.getAttribute("data-state")).not.toBe("playing");
    await runUntil(page, async () => (await video.getAttribute("data-state")) === "playing", { step: FRAME, limit: 8 * FRAME });

    await animationsDone(stage);
    await expect(stage).toHaveCSS("opacity", "1");
    await expect(stage).toHaveCSS("filter", "none");

    // Scrolled away and back, it is simply there, and plays at once.
    await page.evaluate(() => window.scrollTo(0, 0));
    await realFrames(page);
    await flushRenders(page);
    await expect(video).toHaveAttribute("data-state", "paused");
    await stage.scrollIntoViewIfNeeded();
    await realFrames(page);
    await flushRenders(page);
    await expect(stage).toHaveAttribute("data-entry", "in");
    expect(await stage.evaluate((node) => node.getAnimations().length)).toBe(0);
    expect(await ran()).toEqual(["filter", "opacity", "translate"]);
    await flushRenders(page);
    await expect(video).toHaveAttribute("data-state", "playing");
  });
}

test("without script the stages are simply there", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/");
  for (const section of sections) {
    const stage = stageIn(sectionOf(page, section.headline));
    await expect(stage).not.toHaveAttribute("data-entry", /./);
    await expect(stage).toHaveCSS("opacity", "1");
    await expect(stage).toHaveCSS("filter", "none");
  }
  await context.close();
});

test("a tab change crossfades the recordings, never thinning to the dots, and the caption arrives with the new one", async ({
  page,
}) => {
  await stubPlayback(page);
  await installClock(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await stopClockASecondOn(page);
  const section = sectionOf(page, canvas.headline);
  const stage = stageIn(section);
  await enter(page, stage);
  const [first, second] = canvas.tabs;

  await pickFrozen(page, section, second.label);

  // The old recording stays, paused and hidden from everyone, under the new one, which plays.
  await expect(layers(stage)).toHaveCount(2);
  const out = leaving(stage);
  await expect(out).toHaveAttribute("aria-hidden", "true");
  await expect(out).toHaveAttribute("inert", "");
  await expect(out.locator("video")).toHaveAttribute("src", `/videos/${first.recording}.mp4`);
  await expect(out.locator("video")).toHaveAttribute("data-state", "paused");
  await expect(current(stage).locator("video")).toHaveAttribute("src", `/videos/${second.recording}.mp4`);
  await expect(playing(stage)).toHaveCount(1);
  await expect(current(stage).locator("video")).toHaveAttribute("data-state", "playing");

  // Both over the same time; the caption too.
  const caption = panelIn(section).locator("p").last();
  await expect(caption).toContainText(second.caption);
  for (const element of [out, current(stage), caption]) {
    const motion = await motionOf(element);
    expect(motion).toHaveLength(1);
    expect(motion[0]!.duration).toBe(SWAP_MS);
  }
  expect((await motionOf(current(stage)))[0]!.keyframes[0]).toMatchObject({ opacity: "0", translate: "0px 8px" });

  // Halfway, the two together all but cover the stage: no dip to the dots.
  await seek(panelIn(section), SWAP_MS / 2);
  const opacity = (element: Locator) => element.evaluate((node) => Number(getComputedStyle(node).opacity));
  const [arriving, going] = [await opacity(current(stage)), await opacity(out)];
  expect(arriving).toBeGreaterThan(0.5);
  expect(going).toBeGreaterThan(0.5);
  expect(1 - (1 - arriving) * (1 - going)).toBeGreaterThan(0.95);

  // Then the old one goes, and the new one is at rest.
  await finishAll(panelIn(section));
  await expect(leaving(stage)).toHaveCount(0);
  await expect(stage.locator("video")).toHaveCount(1);
  await expect(current(stage)).toHaveCSS("opacity", "1");
  await expect(playing(stage)).toHaveCount(1);
});

test("on a phone the touch-points stage glides between the window's shape and the phone's", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const section = sectionOf(page, touchPoints.headline);
  const stage = stageIn(section);
  await stage.scrollIntoViewIfNeeded();
  await expect(stage).toHaveAttribute("data-entry", "in");
  await animationsDone(stage);
  const phone = touchPoints.tabs.at(-1)!;
  const desktop = touchPoints.tabs[0];

  /** Starts the stage's glide, checks it goes from `from` to `to` through the heights between, and lets it end. */
  const glides = async (label: string, to: number) => {
    const from = (await stage.boundingBox())!.height;
    const width = (await stage.boundingBox())!.width;
    await pickFrozen(page, section, label);
    const [glide, ...others] = (await motionOf(stage)).filter((motion) => motion.keyframes[0]?.height);
    expect(others).toEqual([]);
    expect(glide!.duration).toBe(SWAP_MS);
    expect(parseFloat(String(glide!.keyframes[0]!.height))).toBeCloseTo(from, 0);
    // Halfway through, by the animation's own time, the stage stands between the two shapes, as wide as ever.
    await seek(panelIn(section), SWAP_MS / 2);
    const half = (await stage.boundingBox())!;
    const end = width * to;
    expect(half.width).toBeCloseTo(width, 0);
    expect(half.height).toBeGreaterThan(Math.min(from, end) + 4);
    expect(half.height).toBeLessThan(Math.max(from, end) - 4);
    await finishAll(panelIn(section));
    await expect(leaving(stage)).toHaveCount(0);
    const box = (await stage.boundingBox())!;
    expect(box.height / box.width).toBeCloseTo(to, 2);
  };

  await glides(phone.label, 5 / 4);
  await glides(desktop.label, 2 / 3);
});

test("for a reader who asked for less motion the stage is simply there, and a tab change is instant", async ({ page }) => {
  await stubPlayback(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const section = sectionOf(page, touchPoints.headline);
  const stage = stageIn(section);

  // No entry: in place before it is ever scrolled to.
  await expect(stage).toHaveCSS("opacity", "1");
  await expect(stage).toHaveCSS("filter", "none");
  await expect(stage).toHaveCSS("translate", "none");
  await stage.scrollIntoViewIfNeeded();
  expect(await stage.evaluate((node) => node.getAnimations().length)).toBe(0);

  // No crossfade, no glide: one recording, and the phone's shape at once.
  await section.getByRole("tab", { name: touchPoints.tabs.at(-1)!.label }).click();
  await expect(layers(stage)).toHaveCount(1);
  expect(await panelIn(section).evaluate((node) => node.getAnimations({ subtree: true }).filter((a) => !(a instanceof CSSTransition)).length)).toBe(0);
  const box = (await stage.boundingBox())!;
  expect(box.height / box.width).toBeCloseTo(5 / 4, 2);
});

test("switching tabs quickly drops what is leaving, plays one recording, and ends on the last tab at rest", async ({ page }) => {
  await stubPlayback(page);
  await installClock(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await stopClockASecondOn(page);
  const section = sectionOf(page, touchPoints.headline);
  const stage = stageIn(section);
  await enter(page, stage);
  const [first, second, third] = touchPoints.tabs;
  const last = touchPoints.tabs.at(-1)!;

  // Each pick lands at the very start of the one before, and back to the first tab once.
  for (const tab of [second, third, first, last]) {
    await pickFrozen(page, section, tab.label);
    // The new recording and the one it replaced, never a third; only the new one plays.
    await expect(layers(stage)).toHaveCount(2);
    await expect(current(stage).locator("video")).toHaveAttribute("src", `/videos/${tab.recording}.mp4`);
    await expect(playing(stage)).toHaveCount(1);
    await expect(current(stage).locator("video")).toHaveAttribute("data-state", "playing");
  }

  await finishAll(panelIn(section));
  await expect(section.getByRole("tab", { name: last.label })).toHaveAttribute("aria-selected", "true");
  await expect(layers(stage)).toHaveCount(1);
  await expect(current(stage)).toHaveCSS("opacity", "1");
  await expect(stage.locator("video")).toHaveAttribute("src", `/videos/${last.recording}.mp4`);
  await expect(playing(stage)).toHaveCount(1);
  const box = (await stage.boundingBox())!;
  expect(box.height / box.width).toBeCloseTo(5 / 4, 2);
});
