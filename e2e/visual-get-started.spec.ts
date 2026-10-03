import { expect, test } from "@playwright/test";

// Baselines are rendered on Linux (CI, or the Playwright image locally): font
// rasterisation differs by platform, so other platforms skip unless asked.
test.skip(
  process.platform !== "linux" && !process.env.VISUAL,
  "visual baselines are Linux renders; see README § Visual snapshots",
);

const widths = [390, 1440] as const;
const schemes = ["light", "dark"] as const;

for (const width of widths) {
  for (const colorScheme of schemes) {
    test.describe(`${width} px, ${colorScheme}`, () => {
      test.use({ viewport: { width, height: 900 }, colorScheme });

      test.beforeEach(async ({ page }) => {
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.goto("/");
        await page.evaluate(() => document.fonts.ready);
        // The sticky nav would otherwise sit over whichever section is scrolled to.
        await page.addStyleTag({ content: "header { visibility: hidden !important; }" });
      });

      test("get started", async ({ page }) => {
        await expect(page.locator("#start")).toHaveScreenshot(`start-${width}-${colorScheme}.png`);
      });

      test("questions, one open", async ({ page }) => {
        const section = page.getByRole("region", { name: "Uno more thing." });
        await section.getByRole("button", { name: "How is this different from MCP?" }).click();
        await expect(section).toHaveScreenshot(`questions-${width}-${colorScheme}.png`);
      });

      test("closing band", async ({ page }) => {
        const band = page.getByRole("region", { name: "Uno map for your human and AI teammates." });
        await expect(band).toHaveScreenshot(`closing-${width}-${colorScheme}.png`);
      });
    });
  }
}
