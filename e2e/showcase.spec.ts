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

/** A video's object-fit: on a phone each recording shows whole. */
const fit = (video: Locator) => video.evaluate((node) => getComputedStyle(node).objectFit);

const phone = touchPoints.tabs.find((tab) => tab.value === "phone")!;

for (const width of [1440, 390]) {
  test(`at ${width} px the touch points end on the phone, every tab's stage is one size, and the handset fills it`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const list = page.getByRole("tablist", { name: touchPoints.tabsLabel });
    await expect(list.getByRole("tab")).toHaveCount(touchPoints.tabs.length);
    await expect(list.getByRole("tab").last()).toHaveText(phone.label);
    const size = await expectOneStageSize(page, list, touchPoints.tabs);
    if (width === 390) {
      // A phone's stage stands taller than wide, so the handset's screen reads.
      expect(size.height / size.width).toBeCloseTo(5 / 4, 1);
      for (const tab of touchPoints.tabs.filter((candidate) => candidate !== phone)) {
        await list.getByRole("tab", { name: tab.label }).click();
        expect(await fit(page.getByRole("tabpanel", { name: tab.label }).locator("video"))).toBe("contain");
      }
      await list.getByRole("tab", { name: phone.label }).click();
    }

    const panel = page.getByRole("tabpanel", { name: phone.label });
    await expect(panel.getByText(phone.caption)).toBeVisible();
    const stage = (await panel.getByTestId("showcase-stage").boundingBox())!;
    const frame = (await panel.getByTestId("phone-frame").boundingBox())!;
    expect(frame.y).toBeGreaterThanOrEqual(stage.y);
    expect(frame.y + frame.height).toBeLessThanOrEqual(stage.y + stage.height + 0.5);
    expect(frame.x).toBeGreaterThanOrEqual(stage.x);
    expect(frame.x + frame.width).toBeLessThanOrEqual(stage.x + stage.width);
    expect(frame.height).toBeGreaterThan(stage.height * 0.75);
  });
}

for (const width of [1440, 390]) {
  test(`at ${width} px every canvas tab's stage is one size, and its recording fills the stage`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const list = page.getByRole("tablist", { name: canvas.tabsLabel });
    await expect(list.getByRole("tab")).toHaveText(canvas.tabs.map((tab) => tab.label));
    const size = await expectOneStageSize(page, list, canvas.tabs);
    // On a phone the stage takes the recordings' own 3:2 and shows each whole; wider, it is 16:9 and they cover it.
    const [ratio, objectFit] = width === 390 ? [3 / 2, "contain"] : [16 / 9, "cover"];
    expect(size.width / size.height).toBeCloseTo(ratio, 1);

    for (const tab of canvas.tabs) {
      await list.getByRole("tab", { name: tab.label }).click();
      const stage = page.getByRole("tabpanel", { name: tab.label }).getByTestId("showcase-stage");
      const video = stage.locator("video");
      await expect(video).toHaveAttribute("src", `/videos/${tab.recording}.mp4`);
      await expect(video).toHaveAttribute("poster", `/videos/${tab.recording}.webp`);
      expect(await fit(video)).toBe(objectFit);
      const [outer, inner] = [(await stage.boundingBox())!, (await video.boundingBox())!];
      // The stage's border stays round the recording, which covers the rest.
      expect(inner.width).toBeGreaterThan(outer.width - 4);
      expect(inner.height).toBeGreaterThan(outer.height - 4);
    }
  });
}

test("the phone's recording keeps its own shape inside the handset", async ({ page }) => {
  await page.goto("/");
  const list = page.getByRole("tablist", { name: touchPoints.tabsLabel });
  await list.getByRole("tab", { name: phone.label }).click();
  const video = page.getByRole("tabpanel", { name: phone.label }).locator("video");
  await video.scrollIntoViewIfNeeded();
  // The poster is the recording's first frame, so it has the recording's shape; the test browser cannot decode the video itself.
  const shape = await video.evaluate(
    (node: HTMLVideoElement) =>
      new Promise<number>((resolve, reject) => {
        const poster = new Image();
        poster.onload = () => resolve(poster.naturalWidth / poster.naturalHeight);
        poster.onerror = () => reject(new Error(`no poster at ${node.poster}`));
        poster.src = node.poster;
      }),
  );
  const box = (await video.boundingBox())!;
  expect(box.width / box.height).toBeCloseTo(shape, 2);
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

    await panel.getByTestId("showcase-stage").scrollIntoViewIfNeeded();
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
    await panel.getByTestId("showcase-stage").scrollIntoViewIfNeeded();
    const play = panel.getByRole("button", { name: showcase.play });
    await expect(play).toBeVisible();
    await expect(video).not.toHaveAttribute("data-state", "playing");

    await play.click();
    await expect(video).toHaveAttribute("data-state", "playing");
    await expect(panel.getByRole("button", { name: showcase.pause })).toBeVisible();
  });
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
