import { expect, test, type Locator, type Page } from "@playwright/test";
import { canvas } from "@/content/canvas";
import { touchPoints } from "@/content/touch-points";
import { FRAME, flushRenders, installClock, keepRealFrames, realFrames, runUntil, stopClockASecondOn, tick } from "./clock";
import {
  ARRIVE_DELAY,
  GLIDE_MS,
  RECORDING_ENTRY_DELAY,
  RECORDING_ENTRY_MS,
  captionWords,
  countAnimations,
  expectWordByWord,
  finishAll,
  freezeNext,
  look,
  seek,
  shownCaptionIn,
} from "./motion";

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

/** Counts the animations the page starts on each stage (`data-animated`). */
const countStageAnimations = (page: Page) => countAnimations(page, '[data-testid="showcase-stage"]');

const sections = [
  { name: "canvas", headline: canvas.headline, tabs: canvas.tabs },
  { name: "touch points", headline: touchPoints.headline, tabs: touchPoints.tabs },
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
/** The caption under the stage, drawn word by word, and the layer of it showing. */
const shownCaption = (section: Locator) => shownCaptionIn(panelIn(section));

/** Picks a tab with the motion it starts held at its first frame. */
async function pickFrozen(page: Page, section: Locator, label: string) {
  await freezeNext(panelIn(section), { childList: true, subtree: true });
  await section.getByRole("tab", { name: label }).dispatchEvent("click");
  await flushRenders(page);
  await flushRenders(page);
}

/**
 * Brings the stage into view on a stopped page clock and runs its entry to
 * its end: the motion at once, the clock to the recording's start.
 */
async function enter(page: Page, section: Locator) {
  const stage = stageIn(section);
  await stage.scrollIntoViewIfNeeded();
  await realFrames(page);
  await flushRenders(page);
  await expect(stage).toHaveAttribute("data-entry", "in");
  await finishAll(panelIn(section));
  await runUntil(page, async () => (await playing(stage).count()) === 1, {
    step: FRAME,
    limit: RECORDING_ENTRY_DELAY + RECORDING_ENTRY_MS + 8 * FRAME,
  });
}

for (const section of sections) {
  test(`the ${section.name} stage enters once, in two beats, as its caption arrives word by word, and plays once in place`, async ({
    page,
  }) => {
    await stubPlayback(page);
    await countStageAnimations(page);
    await installClock(page);
    await page.goto("/");
    await stopClockASecondOn(page);
    const sectionLocator = sectionOf(page, section.headline);
    const stage = stageIn(sectionLocator);
    const video = stage.locator("video");

    // Out of view, once the page is live, it waits at the entry's first frame.
    await expect(stage).toHaveAttribute("data-entry", "waiting");
    expect(await look(stage)).toMatchObject({ opacity: 0, down: 48, blur: 16 });
    expect((await look(stage)).scale).toBeCloseTo(0.94, 2);

    await freezeNext(stage, { attributes: true, attributeFilter: ["data-entry"] });
    await stage.scrollIntoViewIfNeeded();
    await realFrames(page);
    await flushRenders(page);
    await expect(stage).toHaveAttribute("data-entry", "in");

    // 150 ms in, the frame is still well on its way, and the recording has not yet begun: its own beat.
    await seek(panelIn(sectionLocator), 150);
    const frame = await look(stage);
    expect(frame.opacity).toBeLessThan(0.85);
    expect(frame.down).toBeGreaterThan(12);
    expect(frame.blur).toBeGreaterThan(3);
    expect(frame.scale).toBeLessThan(0.98);
    expect((await look(current(stage))).opacity).toBe(0);
    // 300 ms in, the frame has nearly arrived, and the recording is only starting to rise.
    await seek(panelIn(sectionLocator), 300);
    const inner = await look(current(stage));
    expect(inner.opacity).toBeLessThan(0.5);
    expect(inner.down).toBeGreaterThan(10);
    expect(inner.blur).toBeGreaterThan(3);
    // 500 ms in, the recording is still on its way.
    await seek(panelIn(sectionLocator), 500);
    expect((await look(current(stage))).opacity).toBeLessThan(0.95);

    // The caption arrives word by word, with the recording.
    expectWordByWord(await captionWords(panelIn(sectionLocator)), section.tabs[0], RECORDING_ENTRY_DELAY);

    // The recording plays once it is in place, by the page's clock.
    await finishAll(panelIn(sectionLocator));
    await tick(page, RECORDING_ENTRY_DELAY + RECORDING_ENTRY_MS - 4 * FRAME);
    await flushRenders(page);
    expect(await video.getAttribute("data-state")).not.toBe("playing");
    await runUntil(page, async () => (await video.getAttribute("data-state")) === "playing", { step: FRAME, limit: 8 * FRAME });
    expect(await look(stage)).toMatchObject({ opacity: 1, down: 0, blur: 0, scale: 1 });

    // Scrolled away and back, it is simply there, and plays at once.
    await page.evaluate(() => window.scrollTo(0, 0));
    await realFrames(page);
    await flushRenders(page);
    await expect(video).toHaveAttribute("data-state", "paused");
    await stage.scrollIntoViewIfNeeded();
    await realFrames(page);
    await flushRenders(page);
    await expect(stage).toHaveAttribute("data-entry", "in");
    await expect(stage).toHaveAttribute("data-animated", "1");
    await expect(video).toHaveAttribute("data-state", "playing");
  });
}

test("a stage partly in sight as the page goes live is simply there, with no entry", async ({ page }) => {
  await countStageAnimations(page);
  await keepRealFrames(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  // The page's scripts are held, so it is scrolled before it goes live.
  const held: (() => Promise<void>)[] = [];
  let holding = true;
  await page.route(/\/_next\/static\/.*\.js$/, (route) => {
    if (holding) held.push(() => route.continue());
    else return route.continue();
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const stage = stageIn(sectionOf(page, canvas.headline));
  // A tenth of the stage shows at the foot of the screen: in sight, short of the entry's quarter.
  await stage.evaluate((node) => {
    const { top, height } = node.getBoundingClientRect();
    scrollBy(0, top - innerHeight + height / 10);
  });
  const shows = await stage.evaluate((node) => {
    const { top, height } = node.getBoundingClientRect();
    return (innerHeight - top) / height;
  });
  expect(shows).toBeGreaterThan(0);
  expect(shows).toBeLessThan(0.25);

  holding = false;
  await Promise.all(held.map((go) => go()));
  await expect(stage).toHaveAttribute("data-entry", "in");
  expect(await look(stage)).toMatchObject({ opacity: 1, down: 0, blur: 0 });

  // Brought fully into view, it stays as it was.
  await stage.scrollIntoViewIfNeeded();
  await realFrames(page);
  expect(await look(stage)).toMatchObject({ opacity: 1, down: 0, blur: 0 });
  await expect(stage).not.toHaveAttribute("data-animated", /./);
});

test("without script the stages and their captions are simply there", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/");
  for (const section of sections) {
    const sectionLocator = sectionOf(page, section.headline);
    const stage = stageIn(sectionLocator);
    await expect(stage).not.toHaveAttribute("data-entry", /./);
    await expect(stage).toHaveCSS("opacity", "1");
    await expect(stage).toHaveCSS("filter", "none");
    await expect(shownCaption(sectionLocator)).toContainText(section.tabs[0].caption);
  }
  await context.close();
});

test("a tab change: the old recording sinks away, the new one rises in after it, and the caption changes word by word", async ({
  page,
}) => {
  await stubPlayback(page);
  await installClock(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await stopClockASecondOn(page);
  const section = sectionOf(page, canvas.headline);
  const stage = stageIn(section);
  await enter(page, section);
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

  // Before its delay the new one waits, unseen, as the old one starts to go.
  await seek(panelIn(section), ARRIVE_DELAY / 2);
  expect((await look(current(stage))).opacity).toBe(0);

  // 150 ms in: the old one is sinking, shrinking and blurring; the new one has only begun.
  await seek(panelIn(section), 150);
  const going = await look(out);
  expect(going.opacity).toBeLessThan(1);
  expect(going.opacity).toBeGreaterThan(0);
  expect(going.down).toBeGreaterThan(1);
  expect(going.blur).toBeGreaterThan(0.5);
  expect(going.scale).toBeLessThan(1);
  const coming = await look(current(stage));
  expect(coming.opacity).toBeLessThan(0.5);
  expect(coming.down).toBeGreaterThan(10);
  expect(coming.blur).toBeGreaterThan(3);
  expect(coming.scale).toBeLessThan(1);

  // 250 ms in, the new one is still rising out of its blur.
  await seek(panelIn(section), 250);
  const rising = await look(current(stage));
  expect(rising.opacity).toBeLessThan(0.9);
  expect(rising.down).toBeGreaterThan(5);
  expect(rising.blur).toBeGreaterThan(2);

  // The caption: the old one leaves whole as the new one's words arrive one by one.
  await expect(panelIn(section).locator('[data-caption] > [data-phase="out"]')).toContainText(first.caption.split(" ")[0]!);
  expectWordByWord(await captionWords(panelIn(section)), second, 0);

  // Then the old recording goes, and the new one is at rest.
  await finishAll(panelIn(section));
  await expect(leaving(stage)).toHaveCount(0);
  await expect(stage.locator("video")).toHaveCount(1);
  expect(await look(current(stage))).toMatchObject({ opacity: 1, down: 0, blur: 0, scale: 1 });
  await expect(playing(stage)).toHaveCount(1);
});

test("a recording leaving goes even when its exit is cut short, as when the reader asks for less motion mid-change", async ({
  page,
}) => {
  await stubPlayback(page);
  await installClock(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await stopClockASecondOn(page);
  const section = sectionOf(page, canvas.headline);
  const stage = stageIn(section);
  await enter(page, section);
  const [first, second] = canvas.tabs;

  await pickFrozen(page, section, second.label);
  await expect(leaving(stage).locator("video")).toHaveAttribute("src", `/videos/${first.recording}.mp4`);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(leaving(stage)).toHaveCount(0);
  await expect(stage.locator("video")).toHaveCount(1);
  expect(await look(current(stage))).toMatchObject({ opacity: 1, down: 0, blur: 0 });
  await expect(stage.locator("video")).toHaveAttribute("src", `/videos/${second.recording}.mp4`);
});

test("on a phone the touch-points stage glides between the window's shape and the phone's", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const section = sectionOf(page, touchPoints.headline);
  const stage = stageIn(section);
  await stage.scrollIntoViewIfNeeded();
  await expect(stage).toHaveAttribute("data-entry", "in");
  await finishAll(panelIn(section));
  const phone = touchPoints.tabs.at(-1)!;
  const desktop = touchPoints.tabs[0];

  /** The stage's height glide, if it is gliding: its duration, curve and first height. */
  const heightGlide = () =>
    stage.evaluate((node) =>
      node
        .getAnimations()
        .map((animation) => ({
          duration: Number(animation.effect?.getTiming().duration),
          easing: animation.effect?.getTiming().easing,
          from: (animation.effect as KeyframeEffect).getKeyframes()[0]?.height,
        }))
        .filter((glide) => glide.from),
    );

  /** Starts the stage's glide, checks it goes from `from` to `to` through the heights between, and lets it end. */
  const glides = async (label: string, to: number) => {
    const { height: from, width } = (await stage.boundingBox())!;
    await pickFrozen(page, section, label);
    const [glide, ...others] = await heightGlide();
    expect(others).toEqual([]);
    expect(glide!.duration).toBe(GLIDE_MS);
    expect(glide!.easing).toBe("cubic-bezier(0.22, 1, 0.36, 1)");
    expect(parseFloat(String(glide!.from))).toBeCloseTo(from, 0);
    // Halfway through, by the animation's own time, the stage stands between the two shapes, as wide as ever.
    await seek(panelIn(section), GLIDE_MS / 2);
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
  await countStageAnimations(page);
  await keepRealFrames(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const section = sectionOf(page, touchPoints.headline);
  const stage = stageIn(section);

  // No entry: in place before it is ever scrolled to.
  expect(await look(stage)).toMatchObject({ opacity: 1, down: 0, blur: 0 });
  await stage.scrollIntoViewIfNeeded();
  await realFrames(page);

  // No crossfade, no glide: one recording, and the phone's shape at once.
  await section.getByRole("tab", { name: touchPoints.tabs.at(-1)!.label }).click();
  await expect(layers(stage)).toHaveCount(1);
  expect(await panelIn(section).evaluate((node) => node.getAnimations({ subtree: true }).filter((a) => !(a instanceof CSSTransition)).length)).toBe(0);
  await expect(stage).not.toHaveAttribute("data-animated", /./);
  expect(await look(current(stage))).toMatchObject({ opacity: 1, down: 0, blur: 0 });
  await expect(shownCaption(section)).toContainText(touchPoints.tabs.at(-1)!.caption);
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
  await enter(page, section);
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
  expect(await look(current(stage))).toMatchObject({ opacity: 1, down: 0, blur: 0 });
  await expect(stage.locator("video")).toHaveAttribute("src", `/videos/${last.recording}.mp4`);
  await expect(playing(stage)).toHaveCount(1);
  await expect(shownCaption(section)).toContainText(last.caption);
  const box = (await stage.boundingBox())!;
  expect(box.height / box.width).toBeCloseTo(5 / 4, 2);
});

