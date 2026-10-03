import { expect, test } from "@playwright/test";
import { structure } from "../content/structure";
import { showOnly } from "./isolate";

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
        // The section is taller than the viewport, so the sticky nav would land on it mid-capture.
        await page.addStyleTag({ content: "header { visibility: hidden; }" });
        await showOnly(section);
        // The walkthrough alone: the bento after it in the section has its own snapshots.
        const walkthrough = section.locator(":scope > div > :first-child");
        await expect(walkthrough).toHaveScreenshot(`structure-${width}-${colorScheme}.png`);
      });

      test("structure walkthrough pinned on the flat blueprint", async ({ page }) => {
        await page.goto("/");
        await page.evaluate(() => document.fonts.ready);
        const section = page
          .locator("section")
          .filter({ has: page.getByRole("heading", { level: 2, name: heading }) });
        await page.addStyleTag({ content: "header { visibility: hidden; }" });
        await showOnly(section);
        // Scroll down until the line of visibility is being read; the screenshot settles the transitions.
        const title = section.locator("[aria-live] b");
        for (let y = 0; (await title.textContent()) !== "Line of visibility"; y += 40) {
          if (y > 20000) throw new Error("never reached the line of visibility");
          await page.evaluate((top) => window.scrollTo(0, top), y);
          await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
        }
        await expect(page).toHaveScreenshot(`structure-pinned-${width}-${colorScheme}.png`);
      });
    });
  }
}
