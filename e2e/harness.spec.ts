import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

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

  test("the replay button plays the picture again from the start", async ({ page }) => {
    await page.goto("/");
    const harness = section(page);
    await harness.scrollIntoViewIfNeeded();
    const placed = harness.getByText("Drops off the device", { exact: true });
    // The first phrase lands about a second and a half in.
    await expect(placed).toHaveCount(1, { timeout: 5000 });

    await harness.getByRole("button", { name: "Play again" }).click();
    await expect(placed).toHaveCount(0);
    await expect(placed).toHaveCount(1, { timeout: 5000 });
  });

  test("with reduced motion every picture shows its end state", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const harness = section(page);
    for (const cell of ["Drops off the device", "Calls with a quote", "Parts inventory"]) {
      await expect(harness.getByText(cell, { exact: true })).toBeVisible();
    }
    await expect(harness.getByText("Draft, waiting for your sign-off")).toHaveCSS("opacity", "1");

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

  test("slice loops by itself, holds the kind the pointer is on, and has no replay button", async ({ page }) => {
    await page.goto("/");
    const harness = section(page);
    await harness.getByRole("tab", { name: "Slice" }).click();
    await expect(harness.getByRole("button", { name: "Play again" })).toHaveCount(0);
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
      for (const label of labels) tops.push((await panel.getByText(label, { exact: true }).boundingBox())!.y);
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
