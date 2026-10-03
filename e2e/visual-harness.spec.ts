import { expect, test } from "@playwright/test";
import { showOnly } from "./isolate";

// Baselines are rendered on Linux (CI, or the Playwright image locally): font
// rasterisation differs by platform, so other platforms skip unless asked.
test.skip(
  process.platform !== "linux" && !process.env.VISUAL,
  "visual baselines are Linux renders; see README § Visual snapshots",
);

const widths = [390, 1440] as const;
const schemes = ["light", "dark"] as const;
const skills = ["Map", "Slice", "Audit", "What-if"] as const;

for (const width of widths) {
  for (const colorScheme of schemes) {
    test.describe(`${width} px, ${colorScheme}`, () => {
      test.use({ viewport: { width, height: 900 }, colorScheme });

      test.beforeEach(async ({ page }) => {
        // Reduced motion: every picture shows its end state.
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.goto("/");
        await page.evaluate(() => document.fonts.ready);
        // The sticky nav would otherwise sit over the section.
        await page.addStyleTag({ content: "header { visibility: hidden !important; }" });
      });

      for (const skill of skills) {
        test(`harness, ${skill}`, async ({ page }) => {
          const section = page.getByRole("region", { name: "Harness for your agents." });
          await showOnly(section);
          await section.getByRole("tab", { name: skill }).click();
          const name = skill.toLowerCase().replace("-", "");
          await expect(section).toHaveScreenshot(`harness-${name}-${width}-${colorScheme}.png`);
        });
      }
    });
  }
}
