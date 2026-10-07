import type { Locator, Page } from "@playwright/test";

/**
 * Hides every section of the human page but the one holding `target`.
 *
 * A section's screenshot is taken where it sits on the page, and the sections
 * above it decide that position down to a fraction of a pixel, which moves how
 * its text is rasterised. Shown alone, a section always starts at the same
 * place, so adding or changing another section never changes its baseline.
 */
export async function showOnly(target: Locator): Promise<void> {
  await target.evaluate((element) => {
    const main = document.getElementById("human");
    if (!main) throw new Error("no #human main on the page");
    let section: Element | null = element;
    while (section && section.parentElement !== main) section = section.parentElement;
    if (!section) throw new Error("the target is not inside #human");
    for (const child of Array.from(main.children)) {
      if (child !== section) (child as HTMLElement).style.display = "none";
    }
  });
}

/** Hides the whole human page, for shots of what sits outside it. */
export async function hideHumanPage(page: Page): Promise<void> {
  await page.addStyleTag({ content: "#human { display: none !important; }" });
}

/**
 * Lets every element answer `elementFromPoint`. A layer that lets the pointer
 * through still paints, so a check of what is on top has to see it too.
 */
export async function letEveryLayerTakeTheHit(page: Page): Promise<void> {
  await page.addStyleTag({ content: "body * { pointer-events: auto !important; }" });
}
