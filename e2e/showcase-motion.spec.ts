import { expect, test, type Locator, type Page } from "@playwright/test";
import { canvas } from "@/content/canvas";
import { touchPoints } from "@/content/touch-points";
import { FRAME, animationsDone, flushRenders, holdAnimations, installClock, keepRealFrames, keepScriptedAnimations, realFrames, runUntil, stopClockASecondOn, tick } from "./clock";

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
  { name: "canvas", headline: canvas.headline, label: canvas.tabsLabel, tabs: canvas.tabs },
  { name: "touch points", headline: touchPoints.headline, label: touchPoints.tabsLabel, tabs: touchPoints.tabs },
] as const;

const sectionOf = (page: Page, headline: string) =>
  page.locator("section", { has: page.getByRole("heading", { name: headline }) });

const stageIn = (section: Locator) => section.getByTestId("showcase-stage");

/** The stage's own animations and transitions, as name, property and keyframes, for what is running now. */
const motionOf = (element: Locator) =>
  element.evaluate((node) =>
    node.getAnimations().map((animation) => ({
      transition: animation instanceof CSSTransition ? animation.transitionProperty : null,
      duration: Number(animation.effect?.getTiming().duration),
      keyframes: (animation.effect as KeyframeEffect).getKeyframes().map((frame) => ({ ...frame })),
    })),
  );

/** The recording on the stage, and the stills of those leaving it. */
const recording = (stage: Locator) => stage.locator("[data-recording]");
const leaving = (stage: Locator) => stage.locator("[data-leaving]");

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

    // Out of view it waits, faded, lowered and blurred.
    await expect(stage).toHaveAttribute("data-entry", "waiting");
    await expect(stage).toHaveCSS("opacity", "0");
    await expect(stage).toHaveCSS("filter", /blur/);
    await expect(stage).toHaveCSS("translate", "0px 12px");

    // The transitions it runs are noted as they start, however soon they end.
    await stage.evaluate((node) => {
      node.addEventListener("transitionrun", (event) => {
        if (!(event instanceof TransitionEvent)) return;
        if (event.target === node) node.dataset.ran = `${node.dataset.ran ?? ""} ${event.propertyName}`.trim();
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
    expect(await motionOf(stage)).toEqual([]);
    expect(await ran()).toEqual(["filter", "opacity", "translate"]);
    await flushRenders(page);
    await expect(video).toHaveAttribute("data-state", "playing");
  });
}

test("a tab change crossfades the recordings and swaps the caption in time", async ({ page }) => {
  await stubPlayback(page);
  await keepScriptedAnimations(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const section = sectionOf(page, canvas.headline);
  const stage = stageIn(section);
  await stage.scrollIntoViewIfNeeded();
  await animationsDone(stage);
  const [first, second] = canvas.tabs;

  const letGo = await holdAnimations(page);
  await section.getByRole("tab", { name: second.label }).click();

  // The outgoing recording leaves as a still: one video on the stage, the incoming one's.
  await expect(stage.locator("video")).toHaveCount(1);
  await expect(stage.locator("video")).toHaveAttribute("src", `/videos/${second.recording}.mp4`);
  const still = leaving(stage);
  await expect(still).toHaveCount(1);
  await expect(still.locator("..")).toHaveAttribute("aria-hidden", "true");
  await expect(still.locator("img")).toHaveAttribute("src", `/videos/${first.recording}.webp`);

  // It fades out as the incoming one fades and rises in, over the same time.
  const out = await motionOf(still);
  expect(out).toHaveLength(1);
  expect(out[0]!.duration).toBe(SWAP_MS);
  expect(out[0]!.keyframes.at(-1)!.opacity).toBe("0");
  const arriving = await motionOf(recording(stage));
  expect(arriving).toHaveLength(1);
  expect(arriving[0]!.duration).toBe(SWAP_MS);
  expect(arriving[0]!.keyframes[0]).toMatchObject({ opacity: "0", translate: "0px 8px" });
  expect(arriving[0]!.keyframes.at(-1)).toMatchObject({ opacity: "1" });

  // The caption is the new tab's, and arrives with it.
  const caption = section.getByRole("tabpanel").locator("p").last();
  await expect(caption).toContainText(second.caption);
  const captionMotion = await motionOf(caption);
  expect(captionMotion).toHaveLength(1);
  expect(captionMotion[0]!.duration).toBe(SWAP_MS);

  // Then the still goes, and the incoming recording is at rest, playing.
  await letGo();
  await animationsDone(stage);
  await expect(still).toHaveCount(0);
  await expect(recording(stage)).toHaveCSS("opacity", "1");
  await expect(stage.locator("video")).toHaveAttribute("data-state", "playing");
});

test("on a phone the touch-points stage glides between the window's shape and the phone's", async ({ page }) => {
  await keepScriptedAnimations(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const section = sectionOf(page, touchPoints.headline);
  const stage = stageIn(section);
  await stage.scrollIntoViewIfNeeded();
  await animationsDone(stage);
  const phone = touchPoints.tabs.at(-1)!;
  const desktop = touchPoints.tabs[0];

  /** Starts the stage's glide, checks it goes from `from` to `to` through the heights between, and lets it end. */
  const glides = async (label: string, to: number) => {
    const from = (await stage.boundingBox())!.height;
    const letGo = await holdAnimations(page);
    await section.getByRole("tab", { name: label }).click();
    const [glide, ...others] = (await motionOf(stage)).filter((motion) => motion.keyframes[0]?.height);
    expect(others).toEqual([]);
    expect(glide!.duration).toBe(SWAP_MS);
    expect(parseFloat(String(glide!.keyframes[0]!.height))).toBeCloseTo(from, 0);
    // Halfway through, by the animation's own time, the stage stands between the two shapes.
    const half = await stage.evaluate((node) => {
      const animation = node.getAnimations().find((each) => (each.effect as KeyframeEffect).getKeyframes()[0]?.height)!;
      animation.currentTime = Number(animation.effect!.getTiming().duration) / 2;
      return node.getBoundingClientRect().height;
    });
    const width = (await stage.boundingBox())!.width;
    const end = width * to;
    expect(half).toBeGreaterThan(Math.min(from, end) + 4);
    expect(half).toBeLessThan(Math.max(from, end) - 4);
    await letGo();
    await animationsDone(stage);
    const box = (await stage.boundingBox())!;
    expect(box.height / box.width).toBeCloseTo(to, 2);
  };

  await glides(phone.label, 5 / 4);
  await glides(desktop.label, 2 / 3);
});

test("for a reader who asked for less motion the stage is simply there, and a tab change is instant", async ({ page }) => {
  await stubPlayback(page);
  await keepRealFrames(page);
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
  await realFrames(page);
  expect(await motionOf(stage)).toEqual([]);

  // No crossfade, no glide: the phone's shape at once.
  await section.getByRole("tab", { name: touchPoints.tabs.at(-1)!.label }).click();
  await expect(leaving(stage)).toHaveCount(0);
  expect(await motionOf(stage)).toEqual([]);
  expect(await motionOf(recording(stage))).toEqual([]);
  expect(await motionOf(section.getByRole("tabpanel").locator("p").last())).toEqual([]);
  const box = (await stage.boundingBox())!;
  expect(box.height / box.width).toBeCloseTo(5 / 4, 2);
});

test("switching tabs quickly ends on the last tab picked, with one recording playing and the stage at rest", async ({
  page,
}) => {
  await stubPlayback(page);
  await keepRealFrames(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const section = sectionOf(page, touchPoints.headline);
  const stage = stageIn(section);
  await stage.scrollIntoViewIfNeeded();
  await animationsDone(stage);
  const list = section.getByRole("tablist");
  const order = [...touchPoints.tabs.slice(1), touchPoints.tabs[0], touchPoints.tabs.at(-1)!];

  // Each pick lands mid-transition of the one before.
  for (const tab of order) {
    await list.getByRole("tab", { name: tab.label }).dispatchEvent("click");
    await realFrames(page);
    // Never more than the incoming recording and one still leaving.
    await expect(stage.locator("video")).toHaveCount(1);
    expect(await leaving(stage).count()).toBeLessThanOrEqual(1);
  }

  const last = order.at(-1)!;
  await expect(list.getByRole("tab", { name: last.label })).toHaveAttribute("aria-selected", "true");
  await animationsDone(stage);
  await expect(leaving(stage)).toHaveCount(0);
  await expect(recording(stage)).toHaveCSS("opacity", "1");
  const video = stage.locator("video");
  await expect(video).toHaveAttribute("src", `/videos/${last.recording}.mp4`);
  await expect(video).toHaveAttribute("data-state", "playing");
  const box = (await stage.boundingBox())!;
  expect(box.height / box.width).toBeCloseTo(5 / 4, 2);
});
