import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { view } from "@/content/view";

const guideFile = `/${view.agentFile}`;
const humanHeadline = "Get your human and AI teammates on the same page.";
const installCommands = [
  "npm create uno-blueprint@latest",
  "claude plugin marketplace add BilLogic/uno-blueprint",
  "claude plugin install ub@ub-marketplace",
];

test.describe("agent view", () => {
  test("the nav switch shows the guide and switches back", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const guide = page.locator("#agent pre");
    await expect(guide).toBeHidden();

    await page.getByRole("button", { name: "For agents" }).click();
    await expect(guide).toBeVisible();
    await expect(guide).toContainText("# Uno Blueprint");
    await expect(page.getByRole("heading", { level: 1, name: view.agentFile })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: humanHeadline })).toBeHidden();

    await page.getByRole("button", { name: "For humans" }).click();
    await expect(guide).toBeHidden();
    await expect(page.getByRole("heading", { level: 1, name: humanHeadline })).toBeVisible();
  });

  test("the page shows the served markdown, word for word", async ({ page, request }) => {
    const response = await request.get(guideFile);
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toContain("text/markdown");
    const served = await response.text();
    for (const command of installCommands) expect(served).toContain(command);

    await page.goto("/");
    await page.getByRole("button", { name: "Page format" }).click();
    await page.getByRole("menuitemradio", { name: "Agent" }).click();
    expect(await page.locator("#agent pre").textContent()).toBe(served.trimEnd());
  });

  test("the head and llms.txt point agents at the markdown", async ({ page, request }) => {
    await page.goto("/");
    const href = await page
      .locator('link[rel="alternate"][type="text/markdown"]')
      .getAttribute("href");
    expect(href?.endsWith(guideFile)).toBe(true);

    const llms = await request.get("/llms.txt");
    expect(llms.ok()).toBe(true);
    expect(await llms.text()).toContain(guideFile);
  });

  test("the guide never scrolls sideways at 375 px", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await page.getByRole("button", { name: "Page format" }).click();
    await page.getByRole("menuitemradio", { name: "Agent" }).click();
    await expect(page.locator("#agent pre")).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  for (const colorScheme of ["light", "dark"] as const) {
    test(`axe finds no violations in the agent view in ${colorScheme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
      await page.goto("/");
      await page.getByRole("button", { name: "Page format" }).click();
      await page.getByRole("menuitemradio", { name: "Agent" }).click();
      await expect(page.locator("#agent pre")).toBeVisible();
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations).toEqual([]);
    });
  }
});
