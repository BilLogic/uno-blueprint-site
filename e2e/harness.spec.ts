import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { map } from "@/content/harness";
import { HARNESS_HOLD } from "@/lib/harness-loop";

/** How early a timer may fire against its delay as the page reads it, in ms: a frame or so. */
const FRAME_SLACK = 50;

const section = (page: Page) =>
  page.locator("section", { has: page.getByRole("heading", { name: "Harness for your agents." }) });

test.describe("harness showcase", () => {
  test("the tabs switch the picture and its caption, and answer the arrow keys", async ({ page }) => {
    await page.goto("/");
    const harness = section(page);
    await expect(harness.getByRole("tab", { name: "Map" })).toHaveAttribute("aria-selected", "true");
    await expect(harness.getByRole("tabpanel")).toContainText("/ub:map");
    await expect(harness.getByText(/^Map\. Point it at your docs\./)).toBeVisible();

    await harness.getByRole("tab", { name: "Audit" }).click();
    await expect(harness.getByRole("tabpanel")).toContainText("/ub:audit");
    await expect(harness.getByText(/^Audit\. Check that the blueprint still holds\./)).toBeVisible();

    await page.keyboard.press("ArrowRight");
    const whatIf = harness.getByRole("tab", { name: "What-if" });
    await expect(whatIf).toBeFocused();
    await expect(whatIf).toHaveAttribute("aria-selected", "true");
    await expect(harness.getByText(/Nothing is applied until you sign off\.$/)).toBeVisible();
  });

  test("a finished picture holds its last frame, then plays again from the start", async ({ page }) => {
    test.setTimeout(40_000);
    await page.goto("/");
    const harness = section(page);
    const stage = harness.getByRole("tabpanel");
    await harness.scrollIntoViewIfNeeded();
    const first = harness.getByText("Drops off the device", { exact: true });
    const last = harness.getByText(map.placements.at(-1)!.text, { exact: true });
    // Note, in the page, when the picture starts holding and when it next plays again.
    await stage.evaluate((el) => {
      const w = window as unknown as { heldAt?: number; replayedAt?: number };
      new MutationObserver(() => {
        if (w.heldAt === undefined && el.hasAttribute("data-holding")) w.heldAt = performance.now();
        if (w.heldAt !== undefined && w.replayedAt === undefined && !el.hasAttribute("data-holding")) {
          w.replayedAt = performance.now();
        }
      }).observe(el, { attributes: true, attributeFilter: ["data-holding"] });
    });
    // The first phrase lands about a second and a half in, the last about seven.
    await expect(first).toHaveCount(1, { timeout: 5000 });
    await expect(last).toHaveCount(1, { timeout: 10_000 });
    // The finished board holds, its phrases still placed...
    await expect(stage).toHaveAttribute("data-holding", "true", { timeout: 5000 });
    const run = Number(await stage.getAttribute("data-run"));
    await expect(first).toHaveCount(1);
    // ...then plays again from the start, a new run, once the hold is over.
    await expect(stage).toHaveAttribute("data-run", String(run + 1), { timeout: HARNESS_HOLD + 2000 });
    const { heldAt, replayedAt } = await page.evaluate(() => {
      const w = window as unknown as { heldAt: number; replayedAt: number };
      return { heldAt: w.heldAt, replayedAt: w.replayedAt };
    });
    expect(replayedAt - heldAt).toBeGreaterThanOrEqual(HARNESS_HOLD - FRAME_SLACK);
    await expect(first).toHaveCount(0, { timeout: 5000 });
    await expect(first).toHaveCount(1, { timeout: 5000 });
  });

  test("off screen a picture stops looping, and starts over when back", async ({ page }) => {
    test.setTimeout(40_000);
    await page.goto("/");
    const harness = section(page);
    const stage = harness.getByRole("tabpanel");
    await harness.scrollIntoViewIfNeeded();
    const first = harness.getByText("Drops off the device", { exact: true });
    const last = harness.getByText(map.placements.at(-1)!.text, { exact: true });
    await expect(last).toHaveCount(1, { timeout: 12_000 });

    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(stage).not.toHaveAttribute("data-shown");
    await expect(stage).not.toHaveAttribute("data-holding");
    const run = await stage.getAttribute("data-run");
    // Longer than the hold: on screen it would have started again by now.
    await page.waitForTimeout(HARNESS_HOLD + 1000);
    await expect(stage).toHaveAttribute("data-run", run!);
    await expect(first).toHaveCount(1);

    await harness.scrollIntoViewIfNeeded();
    await expect(stage).toHaveAttribute("data-shown", "true");
    await expect(stage).toHaveAttribute("data-run", String(Number(run) + 1));
    await expect(first).toHaveCount(0, { timeout: 2000 });
    await expect(first).toHaveCount(1, { timeout: 5000 });
  });

  test("no picture has a replay button", async ({ page }) => {
    await page.goto("/");
    const harness = section(page);
    for (const tab of ["Map", "Slice", "Audit", "What-if"]) {
      await harness.getByRole("tab", { name: tab }).click();
      await expect(harness.getByRole("tabpanel").getByRole("button", { name: /play again|replay/i })).toHaveCount(0);
    }
  });

  test("with reduced motion every picture shows its end state", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const harness = section(page);
    for (const cell of ["Drops off the device", "Calls with a quote", "Parts inventory"]) {
      await expect(harness.getByText(cell, { exact: true })).toBeVisible();
    }
    // The map ends on the finished board: every phrase placed in its cell, and no tag under it.
    const board = harness.getByRole("tabpanel");
    for (const { text } of map.placements) await expect(board.getByText(text, { exact: true })).toBeVisible();
    await expect(board.getByText(/sign-off/)).toHaveCount(0);

    await harness.getByRole("tab", { name: "What-if" }).click();
    // Every option carries the badge; only the gentlest shows it.
    const shown = await harness
      .getByText("Suggested")
      .evaluateAll((badges) =>
        badges.filter((b) => getComputedStyle(b).opacity === "1").map((b) => b.parentElement?.textContent),
      );
    expect(shown).toHaveLength(1);
    expect(shown[0]).toContain("Online for returning users");
    await expect(harness.getByText(/Differs in \d cells/)).toHaveText([
      "Differs in 7 cells",
      "Differs in 3 cells",
      "Differs in 2 cells",
    ]);

    await harness.getByRole("tab", { name: "Audit" }).click();
    await expect(harness.getByText("Do first")).toHaveCSS("opacity", "1");
  });

  test("slice loops by itself and holds the kind the pointer is on", async ({ page }) => {
    await page.goto("/");
    const harness = section(page);
    await harness.getByRole("tab", { name: "Slice" }).click();
    // A picture plays only while its stage is in view, and a kind under the pointer holds the loop.
    await harness.getByRole("tabpanel").scrollIntoViewIfNeeded();
    await page.mouse.move(0, 0);
    await expect(harness.getByRole("button", { name: "Lane" })).toHaveAttribute("aria-pressed", "true", {
      timeout: 4000,
    });

    const cell = harness.getByRole("button", { name: "Cell" });
    await cell.hover();
    await expect(cell).toHaveAttribute("aria-pressed", "true");
    // Longer than a kind normally holds before the loop moves on.
    await page.waitForTimeout(2000);
    await expect(cell).toHaveAttribute("aria-pressed", "true");
  });

  // Each tab with the labels above its source, its skill and its result.
  const pictures = [
    ["Map", "Your existing context", "/ub:map", "Your blueprint"],
    ["Slice", "Pick a slice", "/ub:slice", "What it takes"],
    ["Audit", "Your blueprint", "/ub:audit", "What to fix first"],
    ["What-if", "Your blueprint today", "/ub:whatif", "Options it explores, none applied"],
  ] as const;

  test("on a phone each picture reads top to bottom, source, skill, result, and fits the screen", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const harness = section(page);
    for (const [tab, ...labels] of pictures) {
      await harness.getByRole("tab", { name: tab }).click();
      const panel = harness.getByRole("tabpanel");
      const tops = [];
      for (const label of labels) {
        // The tab's picture mounts after the click; wait for it rather than reading a box that is not there yet.
        const text = panel.getByText(label, { exact: true });
        await expect(text).toBeVisible();
        tops.push((await text.boundingBox())!.y);
      }
      expect(tops).toEqual([...tops].sort((a, b) => a - b));
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    }
  });

  for (const colorScheme of ["light", "dark"] as const) {
    test(`axe finds no violations on any tab in ${colorScheme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
      await page.goto("/");
      const harness = section(page);
      for (const [tab] of pictures) {
        await harness.getByRole("tab", { name: tab }).click();
        const results = await new AxeBuilder({ page }).include('main section[aria-label="Harness for your agents."]').analyze();
        expect(results.violations).toEqual([]);
      }
    });
  }
});
