import { expect, test, type Locator, type Page } from "@playwright/test";
import { canvas } from "@/content/canvas";
import { showcase } from "@/content/showcase";
import { touchPoints } from "@/content/touch-points";

/** A showcase's tab labels, in order: the first, the second, then the rest. */
function labels(tabs: readonly { label: string }[]): readonly [string, string, string, ...string[]] {
  const [first, second, third, ...rest] = tabs.map((tab) => tab.label);
  if (!first || !second || !third) throw new Error("a showcase has at least three tabs");
  return [first, second, third, ...rest];
}

/** The last tab's label, where End lands and ArrowLeft wraps to. */
const last = (tabs: readonly [string, ...string[]]) => tabs.at(-1)!;

const rows = [
  {
    name: "canvas",
    label: canvas.tabsLabel,
    tabs: labels(canvas.tabs),
  },
  {
    name: "touch points",
    label: touchPoints.tabsLabel,
    tabs: labels(touchPoints.tabs),
  },
] as const;

const caption = (page: Page, tab: string) =>
  page.getByRole("tabpanel", { name: tab }).getByText(`${tab}.`, { exact: true });

for (const row of rows) {
  test.describe(`the ${row.name} showcase`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/");
    });

    test("is a tab row with one tab stop, and each tab names its panel", async ({ page }) => {
      const list = page.getByRole("tablist", { name: row.label });
      const tabs = list.getByRole("tab");
      await expect(tabs).toHaveText([...row.tabs]);
      await expect(list.locator('[role="tab"][tabindex="0"]')).toHaveCount(1);

      const first = list.getByRole("tab", { name: row.tabs[0] });
      await expect(first).toHaveAttribute("aria-selected", "true");
      const panelId = await first.getAttribute("aria-controls");
      await expect(page.locator(`#${panelId}`)).toHaveRole("tabpanel");
      await expect(caption(page, row.tabs[0])).toBeVisible();
    });

    test("arrow keys, Home and End switch the panel", async ({ page }) => {
      const list = page.getByRole("tablist", { name: row.label });
      await list.getByRole("tab", { name: row.tabs[0] }).focus();

      await page.keyboard.press("ArrowRight");
      const second = list.getByRole("tab", { name: row.tabs[1] });
      await expect(second).toBeFocused();
      await expect(second).toHaveAttribute("aria-selected", "true");
      await expect(caption(page, row.tabs[1])).toBeVisible();
      await expect(caption(page, row.tabs[0])).toHaveCount(0);

      await page.keyboard.press("End");
      await expect(list.getByRole("tab", { name: last(row.tabs) })).toBeFocused();
      await expect(caption(page, last(row.tabs))).toBeVisible();

      await page.keyboard.press("ArrowRight");
      await expect(list.getByRole("tab", { name: row.tabs[0] })).toBeFocused();
      await expect(caption(page, row.tabs[0])).toBeVisible();

      await page.keyboard.press("ArrowLeft");
      await expect(caption(page, last(row.tabs))).toBeVisible();

      await page.keyboard.press("Home");
      await expect(caption(page, row.tabs[0])).toBeVisible();
    });

    test("a click switches the panel", async ({ page }) => {
      const list = page.getByRole("tablist", { name: row.label });
      await list.getByRole("tab", { name: row.tabs[1] }).click();
      await expect(caption(page, row.tabs[1])).toBeVisible();
      await expect(list.getByRole("tab", { name: row.tabs[0] })).toHaveAttribute("aria-selected", "false");
    });
  });
}

/**
 * Opens each tab of one showcase in turn and expects its stage to be the same
 * size as every other tab's, so a tab's picture never shifts the page; the two
 * showcases may differ. Clicking may scroll the tab into view, so only the
 * stage's size is compared. Returns that size.
 */
async function expectOneStageSize(page: Page, list: Locator, tabs: readonly { label: string }[]) {
  const sizes = [];
  for (const tab of tabs) {
    await list.getByRole("tab", { name: tab.label }).click();
    const box = await page.getByRole("tabpanel", { name: tab.label }).getByTestId("showcase-stage").boundingBox();
    sizes.push([box!.width, box!.height] as const);
  }
  expect(new Set(sizes.map(String)).size).toBe(1);
  const [width, height] = sizes[0]!;
  return { width, height };
}

/** Where `inner` sits inside `outer`: the margin on each side, in px. */
async function margins(outer: Locator, inner: Locator) {
  const [o, i] = [(await outer.boundingBox())!, (await inner.boundingBox())!];
  return { left: i.x - o.x, top: i.y - o.y, right: o.x + o.width - i.x - i.width, bottom: o.y + o.height - i.y - i.height };
}

/**
 * A recording's own shape, read from its poster: the poster is its first
 * frame, and the test browser cannot decode the video itself.
 */
const posterShape = async (video: Locator) => {
  // The poster loads only once its stage is near.
  await video.scrollIntoViewIfNeeded();
  await expect(video).toHaveAttribute("poster", /\.webp$/);
  return video.evaluate(
    (node: HTMLVideoElement) =>
      new Promise<number>((resolve, reject) => {
        const poster = new Image();
        poster.onload = () => resolve(poster.naturalWidth / poster.naturalHeight);
        poster.onerror = () => reject(new Error(`no poster at ${node.poster}`));
        poster.src = node.poster;
      }),
  );
};

/**
 * A desktop recording is a window standing on the stage's foot: whole, at its
 * own shape, centred across, with dots above and beside it and none below.
 */
async function expectFlushWindow(stage: Locator) {
  const window = stage.getByTestId("recording-window");
  const box = (await window.boundingBox())!;
  expect(box.width / box.height).toBeCloseTo(await posterShape(window.locator("video")), 2);
  const margin = await margins(stage, window);
  // The stage's one-pixel rim is all that is below it.
  expect(margin.bottom).toBeLessThanOrEqual(1);
  for (const side of [margin.top, margin.left, margin.right]) expect(side).toBeGreaterThanOrEqual(11);
  expect(Math.abs(margin.left - margin.right)).toBeLessThan(1);
  // The recording fills its window, which rounds its upper corners only.
  const video = (await window.locator("video").boundingBox())!;
  expect(video.width).toBeCloseTo(box.width, 0);
  expect(video.height).toBeCloseTo(box.height, 0);
  const radius = (corner: string) => window.evaluate((node, name) => parseFloat(getComputedStyle(node).getPropertyValue(name)), corner);
  expect(await radius("border-top-left-radius")).toBeGreaterThan(0);
  expect(await radius("border-bottom-left-radius")).toBe(0);
}

const phone = touchPoints.tabs.find((tab) => tab.value === "phone")!;

for (const width of [1440, 390]) {
  test(`at ${width} px the touch points end on the phone, every tab's stage is one size, and the phone stands centred in it`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const list = page.getByRole("tablist", { name: touchPoints.tabsLabel });
    await expect(list.getByRole("tab")).toHaveCount(touchPoints.tabs.length);
    await expect(list.getByRole("tab").last()).toHaveText(phone.label);
    const size = await expectOneStageSize(page, list, touchPoints.tabs);
    // On a phone the stage stands taller than wide, so the phone's screen reads.
    if (width === 390) expect(size.height / size.width).toBeCloseTo(5 / 4, 1);
    for (const tab of touchPoints.tabs.filter((candidate) => candidate !== phone)) {
      await list.getByRole("tab", { name: tab.label }).click();
      await expectFlushWindow(page.getByRole("tabpanel", { name: tab.label }).getByTestId("showcase-stage"));
    }
    await list.getByRole("tab", { name: phone.label }).click();

    const panel = page.getByRole("tabpanel", { name: phone.label });
    await expect(panel.getByText(phone.caption)).toBeVisible();
    const stage = panel.getByTestId("showcase-stage");
    const margin = await margins(stage, panel.getByTestId("phone"));
    // Whole, with dots above and below it, and centred both ways.
    expect(margin.top).toBeGreaterThanOrEqual(15);
    expect(margin.bottom).toBeGreaterThanOrEqual(15);
    expect(Math.abs(margin.top - margin.bottom)).toBeLessThan(1);
    expect(Math.abs(margin.left - margin.right)).toBeLessThan(1);
    const [stageBox, phoneBox] = [(await stage.boundingBox())!, (await panel.getByTestId("phone").boundingBox())!];
    expect(phoneBox.height).toBeGreaterThan(stageBox.height * 0.75);
  });
}

for (const width of [1440, 390]) {
  test(`at ${width} px every canvas tab's stage is one size, and its recording is a window on the stage's foot`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const list = page.getByRole("tablist", { name: canvas.tabsLabel });
    await expect(list.getByRole("tab")).toHaveText(canvas.tabs.map((tab) => tab.label));
    const size = await expectOneStageSize(page, list, canvas.tabs);
    // On a phone the stage is 3:2; wider, it is 16:9.
    expect(size.width / size.height).toBeCloseTo(width === 390 ? 3 / 2 : 16 / 9, 1);

    for (const tab of canvas.tabs) {
      await list.getByRole("tab", { name: tab.label }).click();
      const stage = page.getByRole("tabpanel", { name: tab.label }).getByTestId("showcase-stage");
      const video = stage.locator("video");
      await expect(video).toHaveAttribute("src", `/videos/${tab.recording}.mp4`);
      await expect(video).toHaveAttribute("poster", `/videos/${tab.recording}.webp`);
      await expectFlushWindow(stage);
    }
  });
}

test("the phone's recording keeps its own shape, cut to the handset's silhouette", async ({ page }) => {
  await page.goto("/");
  const list = page.getByRole("tablist", { name: touchPoints.tabsLabel });
  await list.getByRole("tab", { name: phone.label }).click();
  const video = page.getByRole("tabpanel", { name: phone.label }).locator("video");
  await video.scrollIntoViewIfNeeded();
  const shape = await posterShape(video);
  const box = (await video.boundingBox())!;
  expect(box.width / box.height).toBeCloseTo(shape, 2);
  expect(await video.evaluate((node) => getComputedStyle(node).maskImage)).toContain(`/videos/${phone.recording}-mask.png`);
});

test("the phone never zooms for a reader who asked for less motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const list = page.getByRole("tablist", { name: touchPoints.tabsLabel });
  await list.getByRole("tab", { name: phone.label }).click();
  const panel = page.getByRole("tabpanel", { name: phone.label });
  await panel.getByTestId("showcase-stage").hover();
  await panel.getByRole("button", { name: showcase.play }).click();
  await expect(panel.getByTestId("phone")).toHaveCSS("transform", "none");
});

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

const [understand, check] = canvas.tabs;

test.describe("a showcase recording", () => {
  test.beforeEach(async ({ page }) => {
    await stubPlayback(page);
  });

  test("loads nothing until its stage is on screen, then plays, pauses and plays again", async ({ page }) => {
    await page.goto("/");
    const panel = page.getByRole("tabpanel", { name: understand.label });
    const video = panel.locator("video");
    await expect(video).toHaveAttribute("preload", "none");
    await expect(video).toHaveAccessibleName(`${understand.label}. ${understand.caption}`);
    await expect(video).not.toHaveAttribute("data-state", "playing");

    await panel.getByTestId("showcase-stage").hover();
    await expect(video).toHaveAttribute("data-state", "playing");

    const button = panel.getByRole("button", { name: showcase.pause });
    await button.click();
    await expect(video).toHaveAttribute("data-state", "paused");
    await panel.getByRole("button", { name: showcase.play }).click();
    await expect(video).toHaveAttribute("data-state", "playing");

    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(video).toHaveAttribute("data-state", "paused");
  });

  test("starts from its first frame when its tab is selected", async ({ page }) => {
    await page.goto("/");
    const list = page.getByRole("tablist", { name: canvas.tabsLabel });
    await list.scrollIntoViewIfNeeded();
    await list.getByRole("tab", { name: check.label }).click();
    const video = page.getByRole("tabpanel", { name: check.label }).locator("video");
    await expect(video).toHaveAttribute("data-state", "playing");
    expect(await video.evaluate((node: HTMLVideoElement) => node.currentTime)).toBe(0);
  });

  test("waits for Play when the reader asked for less motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const panel = page.getByRole("tabpanel", { name: understand.label });
    const video = panel.locator("video");
    await panel.getByTestId("showcase-stage").hover();
    const play = panel.getByRole("button", { name: showcase.play });
    await expect(play).toBeVisible();
    await expect(video).not.toHaveAttribute("data-state", "playing");

    await play.click();
    await expect(video).toHaveAttribute("data-state", "playing");
    await expect(panel.getByRole("button", { name: showcase.pause })).toBeVisible();
  });
});

test("Pause/Play shows while the stage is pointed at or focused", async ({ page }) => {
  await page.goto("/");
  const panel = page.getByRole("tabpanel", { name: understand.label });
  const stage = panel.getByTestId("showcase-stage");
  const button = panel.getByRole("button", { name: showcase.pause });
  // The button's wrapper is what fades.
  const reveal = button.locator("..");
  await stage.scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  await expect(reveal).toHaveCSS("opacity", "0");
  await stage.hover();
  await expect(reveal).toHaveCSS("opacity", "1");
  await page.mouse.move(0, 0);
  await expect(reveal).toHaveCSS("opacity", "0");
  await button.focus();
  await expect(reveal).toHaveCSS("opacity", "1");
});

test("on a touch screen Pause/Play always shows", async ({ browser }) => {
  const context = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto("/");
  const panel = page.getByRole("tabpanel", { name: understand.label });
  await panel.getByTestId("showcase-stage").scrollIntoViewIfNeeded();
  await expect(panel.getByRole("button", { name: showcase.pause }).locator("..")).toHaveCSS("opacity", "1");
  await context.close();
});

for (const width of [1440, 390]) {
  test(`at ${width} px a showcase ${width === 390 ? "offers" : "has no"} a fullscreen button`, async ({ page }) => {
    await page.addInitScript(() => {
      HTMLElement.prototype.requestFullscreen = function () {
        this.dataset.fullscreen = "requested";
        return Promise.resolve();
      };
    });
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const panel = page.getByRole("tabpanel", { name: understand.label });
    const button = panel.getByRole("button", { name: showcase.fullscreen });
    if (width !== 390) {
      await expect(button).toBeHidden();
      return;
    }
    await panel.getByTestId("showcase-stage").scrollIntoViewIfNeeded();
    await button.click();
    await expect(panel.locator("video")).toHaveAttribute("data-fullscreen", "requested");
  });
}

test("the canvas's side link sits beside the headline, and on a phone under the sub-headline", async ({ page }) => {
  const section = page.locator("section", {
    has: page.getByRole("heading", { name: canvas.headline }),
  });
  const sub = section.getByText(canvas.subheadline, { exact: true });
  const link = section.getByRole("link", { name: canvas.more.label });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  let [subBox, linkBox] = [await sub.boundingBox(), await link.boundingBox()];
  expect(linkBox!.x).toBeGreaterThan(subBox!.x + subBox!.width);

  await page.setViewportSize({ width: 390, height: 844 });
  [subBox, linkBox] = [await sub.boundingBox(), await link.boundingBox()];
  expect(linkBox!.y).toBeGreaterThanOrEqual(subBox!.y + subBox!.height);
});
