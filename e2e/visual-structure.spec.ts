import { expect, test } from "@playwright/test";
import { structure } from "../content/structure";

// Baselines are rendered on Linux (CI, or the Playwright image locally): font
// rasterisation differs by platform, so other platforms skip unless asked.
test.skip(
  process.platform !== "linux" && !process.env.VISUAL,
  "visual baselines are Linux renders; see README § Visual snapshots",
);

const widths = [390, 1440] as const;
const schemes = ["light", "dark"] as const;
const heading = `${structure.heading.lead} ${structure.heading.main}`;

for (const width of widths) {
  for (const colorScheme of schemes) {
    test.describe(`${width} px, ${colorScheme}`, () => {
      test.use({ viewport: { width, height: 900 }, colorScheme });

      test("structure walkthrough at its last step", async ({ page }) => {
        // Reduced motion shows the end state: the picked cell open in its panel.
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.goto("/");
        await page.evaluate(() => document.fonts.ready);
        const section = page
          .locator("section")
          .filter({ has: page.getByRole("heading", { level: 2, name: heading }) });
        await section.scrollIntoViewIfNeeded();
        await expect(section.locator("[aria-live] b")).toHaveText(structure.steps.at(-1)!.title);
        await expect(section).toHaveScreenshot(`structure-${width}-${colorScheme}.png`);
      });
    });
  }
}
