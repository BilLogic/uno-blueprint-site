import { expect, test, type Locator, type Page } from "@playwright/test";
import { harness, map } from "@/content/harness";
import { HARNESS_HOLD } from "@/lib/harness-loop";
import { mapSteps } from "@/lib/harness-map";
import { FRAME, flushRenders, installClock, keepRealFrames, realFrames, runUntil, stopClockASecondOn } from "./clock";
import {
  ARRIVE_DELAY,
  GLIDE_MS,
  RECORDING_ENTRY_DELAY,
  captionWords,
  countAnimations,
  expectWordByWord,
  finishAll,
  freezeNext,
  look,
  scripted,
  seek,
  shownCaptionIn,
} from "./motion";

/*
 * The harness showcase moves as the demo stages do: the same entry, the same
 * switch, the same caption. Its pictures replay on their own loop, which
 * never replays that motion.
 */

const [mapTab, sliceTab, auditTab, whatIfTab] = harness.skills;

/** The map picture's first placed phrase, and when it lands after the picture starts, in ms. */
const firstPlace = mapSteps(map.readOrder).find((step) => step.kind === "place")!;
const firstPlaced = map.placements[firstPlace.kind === "end" ? 0 : firstPlace.phrase]!.text;

const sectionOf = (page: Page) => page.locator("section", { has: page.getByRole("heading", { name: harness.headline }) });
const stageIn = (section: Locator) => section.getByRole("tabpanel");
/** The pictures on the stage: the one showing, and the one leaving, if any. */
const layers = (stage: Locator) => stage.locator("[data-picture]");
const leaving = (stage: Locator) => stage.locator("[data-picture][data-leaving]");
const current = (stage: Locator) => stage.locator("[data-picture]:not([data-leaving])");
const placed = (section: Locator) => current(stageIn(section)).getByText(firstPlaced, { exact: true });

/** Counts the animations the page starts on the stage and on each picture's layer (`data-animated`). */
const countStageAnimations = (page: Page) =>
  countAnimations(page, `section[aria-label="${harness.headline}"] [role="tabpanel"], [data-picture]`);

/** Picks a tab with the motion it starts held at its first frame. */
async function pickFrozen(page: Page, section: Locator, label: string) {
  await freezeNext(stageIn(section), { childList: true, subtree: true });
  await section.getByRole("tab", { name: label }).dispatchEvent("click");
  await flushRenders(page);
  await flushRenders(page);
}

/** Brings the stage into view on a stopped page clock and runs its entry to its end at once; the picture then plays. */
async function enter(page: Page, section: Locator) {
  const stage = stageIn(section);
  await stage.scrollIntoViewIfNeeded();
  await realFrames(page);
  await flushRenders(page);
  await expect(stage).toHaveAttribute("data-entry", "in");
  await finishAll(section);
  await flushRenders(page);
}

test("the harness stage enters once, in two beats, as its caption arrives word by word, and its picture plays once in place", async ({
  page,
}) => {
  await countStageAnimations(page);
  await installClock(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await stopClockASecondOn(page);
  const section = sectionOf(page);
  const stage = stageIn(section);

  // Out of view, once the page is live, it waits at the entry's first frame.
  await expect(stage).toHaveAttribute("data-entry", "waiting");
  expect(await look(stage)).toMatchObject({ opacity: 0, down: 48, blur: 16 });
  expect((await look(stage)).scale).toBeCloseTo(0.94, 2);

  await freezeNext(stage, { attributes: true, attributeFilter: ["data-entry"] });
  await stage.scrollIntoViewIfNeeded();
  await realFrames(page);
  await flushRenders(page);
  await expect(stage).toHaveAttribute("data-entry", "in");

  // 150 ms in, the frame is still well on its way, and the picture has not yet begun: its own beat.
  await seek(section, 150);
  const frame = await look(stage);
  expect(frame.opacity).toBeLessThan(0.85);
  expect(frame.down).toBeGreaterThan(12);
  expect(frame.blur).toBeGreaterThan(3);
  expect(frame.scale).toBeLessThan(0.98);
  expect((await look(current(stage))).opacity).toBe(0);
  // 300 ms in, the frame has nearly arrived, and the picture is only starting to rise.
  await seek(section, 300);
  const inner = await look(current(stage));
  expect(inner.opacity).toBeLessThan(0.5);
  expect(inner.down).toBeGreaterThan(10);
  expect(inner.blur).toBeGreaterThan(3);
  // 500 ms in, the picture is still on its way.
  await seek(section, 500);
  expect((await look(current(stage))).opacity).toBeLessThan(0.95);

  // The caption arrives word by word, with the picture.
  expectWordByWord(await captionWords(section), mapTab, RECORDING_ENTRY_DELAY);

  // The picture plays once it is in place: held mid-entry, it has not started, however long the page's clock runs.
  await page.clock.runFor(firstPlace.at + 500);
  await flushRenders(page);
  await expect(placed(section)).toHaveCount(0);
  // Once the entry ends, it plays from its start.
  await finishAll(section);
  await flushRenders(page);
  await runUntil(page, async () => (await placed(section).count()) === 1, { step: FRAME, limit: firstPlace.at + 8 * FRAME });
  expect(await look(stage)).toMatchObject({ opacity: 1, down: 0, blur: 0, scale: 1 });
  expect(await look(current(stage))).toMatchObject({ opacity: 1, down: 0, blur: 0, scale: 1 });

  // Scrolled away and back, it is simply there, and its picture starts over without moving the stage.
  await page.evaluate(() => window.scrollTo(0, 0));
  await realFrames(page);
  await expect(stage).not.toHaveAttribute("data-shown");
  await stage.scrollIntoViewIfNeeded();
  await realFrames(page);
  await flushRenders(page);
  await expect(stage).toHaveAttribute("data-shown", "true");
  await expect(stage).toHaveAttribute("data-entry", "in");
  await expect(stage).toHaveAttribute("data-animated", "1");
  await expect(current(stage)).toHaveAttribute("data-animated", "1");
  expect(await scripted(stage)).toBe(0);
});

test("the picture's own replays never replay the entry or the switch", async ({ page }) => {
  await countStageAnimations(page);
  await installClock(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await stopClockASecondOn(page);
  const section = sectionOf(page);
  const stage = stageIn(section);
  await enter(page, section);

  /** The stage and its picture's layer are where they were, and nothing new moves them. */
  const still = async () => {
    await expect(stage).toHaveAttribute("data-animated", "1");
    await expect(layers(stage)).toHaveCount(1);
    await expect(current(stage)).toHaveAttribute("data-animated", "1");
    expect(await scripted(stage)).toBe(0);
    expect(await look(stage)).toMatchObject({ opacity: 1, down: 0, blur: 0, scale: 1 });
    expect(await look(current(stage))).toMatchObject({ opacity: 1, down: 0, blur: 0, scale: 1 });
  };

  // The finished picture holds its last frame, then plays again from the start.
  const run = Number(await stage.getAttribute("data-run"));
  await runUntil(page, async () => (await stage.getAttribute("data-holding")) === "true", { limit: 15_000 });
  await runUntil(page, async () => (await stage.getAttribute("data-run")) === String(run + 1), {
    step: FRAME,
    limit: HARNESS_HOLD + 8 * FRAME,
  });
  await expect(placed(section)).toHaveCount(0);
  await still();

  // A picture whose layout moves under it (a new width) starts again too.
  await runUntil(page, async () => (await placed(section).count()) === 1, { limit: 5000 });
  await page.setViewportSize({ width: 1400, height: 900 });
  await realFrames(page);
  await runUntil(page, async () => Number(await stage.getAttribute("data-run")) >= run + 2, { limit: 1000 });
  await stage.scrollIntoViewIfNeeded();
  await still();

  // A tab picked does move it: the new picture rises in.
  await section.getByRole("tab", { name: sliceTab.label }).dispatchEvent("click");
  await flushRenders(page);
  await expect(current(stage)).toHaveAttribute("data-animated", "1");
  expect(await scripted(stage)).toBeGreaterThan(0);
});

test("without script the harness stage and its caption are simply there", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/");
  const section = sectionOf(page);
  const stage = stageIn(section);
  await expect(stage).not.toHaveAttribute("data-entry", /./);
  await expect(stage).toHaveCSS("opacity", "1");
  await expect(stage).toHaveCSS("filter", "none");
  await expect(shownCaptionIn(section)).toContainText(mapTab.caption);
  await context.close();
});

test("a tab change: the old picture sinks away, the new one rises in after it from its first frame, and the caption changes word by word", async ({
  page,
}) => {
  await installClock(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await stopClockASecondOn(page);
  const section = sectionOf(page);
  const stage = stageIn(section);
  await enter(page, section);
  await runUntil(page, async () => (await placed(section).count()) === 1, { limit: 5000 });
  const run = Number(await stage.getAttribute("data-run"));

  await pickFrozen(page, section, sliceTab.label);

  // The old picture stays, as it was and hidden from everyone, under the new one, which starts afresh.
  await expect(layers(stage)).toHaveCount(2);
  const out = leaving(stage);
  await expect(out).toHaveAttribute("aria-hidden", "true");
  await expect(out).toHaveAttribute("inert", "");
  await expect(out).toContainText(mapTab.command);
  await expect(out.getByText(firstPlaced, { exact: true })).toHaveCount(1);
  await expect(current(stage)).toContainText(sliceTab.command);
  await expect(stage).toHaveAttribute("data-run", String(run + 1));

  // Before its delay the new one waits, unseen, as the old one starts to go.
  await seek(section, ARRIVE_DELAY / 2);
  expect((await look(current(stage))).opacity).toBe(0);

  // 150 ms in: the old one is sinking, shrinking and blurring; the new one has only begun.
  await seek(section, 150);
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
  await seek(section, 250);
  const rising = await look(current(stage));
  expect(rising.opacity).toBeLessThan(0.9);
  expect(rising.down).toBeGreaterThan(5);
  expect(rising.blur).toBeGreaterThan(2);

  // The caption: the old one leaves whole as the new one's words arrive one by one.
  await expect(section.locator('[data-caption] > [data-phase="out"]')).toContainText(mapTab.caption.split(" ")[0]!);
  expectWordByWord(await captionWords(section), sliceTab, 0);

  // Then the old picture goes, and the new one is at rest.
  await finishAll(section);
  await expect(leaving(stage)).toHaveCount(0);
  expect(await look(current(stage))).toMatchObject({ opacity: 1, down: 0, blur: 0, scale: 1 });
  expect(await look(stage)).toMatchObject({ opacity: 1, down: 0, blur: 0, scale: 1 });
});

test("for a reader who asked for less motion the harness stage is simply there, and a tab change is instant", async ({ page }) => {
  await countStageAnimations(page);
  await keepRealFrames(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const section = sectionOf(page);
  const stage = stageIn(section);

  // No entry: in place before it is ever scrolled to.
  await expect(stage).toHaveAttribute("data-entry", "in");
  expect(await look(stage)).toMatchObject({ opacity: 1, down: 0, blur: 0 });
  await stage.scrollIntoViewIfNeeded();
  await realFrames(page);

  // No sinking or rising: one picture, the new tab's, at once, and its caption with it.
  await section.getByRole("tab", { name: auditTab.label }).click();
  await expect(layers(stage)).toHaveCount(1);
  await expect(current(stage)).toContainText(auditTab.command);
  expect(await scripted(section)).toBe(0);
  await expect(stage).not.toHaveAttribute("data-animated", /./);
  await expect(current(stage)).not.toHaveAttribute("data-animated", /./);
  expect(await look(current(stage))).toMatchObject({ opacity: 1, down: 0, blur: 0 });
  await expect(shownCaptionIn(section)).toContainText(auditTab.caption);
});

test("switching harness tabs quickly drops what is leaving, and ends on the last tab at rest, its picture from the start", async ({
  page,
}) => {
  await installClock(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await stopClockASecondOn(page);
  const section = sectionOf(page);
  const stage = stageIn(section);
  await enter(page, section);
  await runUntil(page, async () => (await placed(section).count()) === 1, { limit: 5000 });

  // Each pick lands at the very start of the one before, and back to the first tab at the end.
  for (const tab of [sliceTab, auditTab, whatIfTab, mapTab]) {
    await pickFrozen(page, section, tab.label);
    // The new picture and the one it replaced, never a third.
    await expect(layers(stage)).toHaveCount(2);
    await expect(current(stage)).toContainText(tab.command);
  }

  await finishAll(section);
  await expect(section.getByRole("tab", { name: mapTab.label })).toHaveAttribute("aria-selected", "true");
  await expect(layers(stage)).toHaveCount(1);
  expect(await look(current(stage))).toMatchObject({ opacity: 1, down: 0, blur: 0, scale: 1 });
  await expect(shownCaptionIn(section)).toContainText(mapTab.caption);
  // The map starts again from its first frame, and plays through.
  await expect(placed(section)).toHaveCount(0);
  await runUntil(page, async () => (await placed(section).count()) === 1, { step: FRAME, limit: firstPlace.at + 8 * FRAME });
});

test("on a phone the harness stage glides to the height of the picture picked", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const section = sectionOf(page);
  const stage = stageIn(section);
  await stage.scrollIntoViewIfNeeded();
  await expect(stage).toHaveAttribute("data-entry", "in");
  await finishAll(section);

  /** The stage's height glide, if it is gliding: its duration and first height. */
  const heightGlide = () =>
    stage.evaluate((node) =>
      node
        .getAnimations()
        .map((animation) => ({
          duration: Number(animation.effect?.getTiming().duration),
          from: (animation.effect as KeyframeEffect).getKeyframes()[0]?.height,
        }))
        .filter((glide) => glide.from),
    );

  for (const tab of [auditTab, mapTab]) {
    const from = (await stage.boundingBox())!.height;
    await pickFrozen(page, section, tab.label);
    const [glide, ...others] = await heightGlide();
    expect(others).toEqual([]);
    expect(glide!.duration).toBe(GLIDE_MS);
    expect(parseFloat(String(glide!.from))).toBeCloseTo(from, 0);
    await finishAll(section);
    await expect(leaving(stage)).toHaveCount(0);
    // At rest, the stage is the picture's own height again.
    const to = (await stage.boundingBox())!.height;
    expect(Math.abs(to - from)).toBeGreaterThan(20);
    expect(await stage.evaluate((node) => node.style.height)).toBe("");
  }
});
