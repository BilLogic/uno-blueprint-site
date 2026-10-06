import { test, type Page } from "@playwright/test";
import { exitScroll, scrollToStep } from "./walkthrough-scroll";
import { structure } from "../content/structure";

// Temporary CI diagnostic for the phone swipe at the walkthrough's exit. Removed before merge.
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
const titles = structure.steps.map((s) => s.title);

const instrument = (page: Page) =>
  page.evaluate(() => {
    const w = window as unknown as { log: string[] };
    w.log = [];
    const t0 = performance.now();
    const t = () => Math.round(performance.now() - t0);
    const lock = () => (document.documentElement.hasAttribute("data-scroll-held") ? "L" : "-");
    addEventListener("touchstart", () => w.log.push(`${t()} ts y=${Math.round(scrollY)}`), { passive: true });
    addEventListener("touchmove", (e) => w.log.push(`${t()} tm c=${e.cancelable} y=${Math.round(scrollY)}`), { passive: true });
    addEventListener("touchend", () => w.log.push(`${t()} te y=${Math.round(scrollY)}`), { passive: true });
    addEventListener("scroll", () => w.log.push(`${t()} sc y=${Math.round(scrollY)} ${lock()}`), { passive: true });
    new MutationObserver(() => w.log.push(`${t()} attr ${lock()}`)).observe(document.documentElement, { attributes: true, attributeFilter: ["data-scroll-held"] });
    const frame = () => { w.log.push(`${t()} f`); if (performance.now() - t0 < 3000) requestAnimationFrame(frame); };
    requestAnimationFrame(frame);
  });

for (const [i, wait] of [0, 0, 0, 300, 300, 300].entries()) {
  test(`probe swipe at the exit, waiting ${wait} ms after Cells (${i})`, async ({ page }) => {
    await page.goto("/");
    const section = page.locator("section").filter({ has: page.locator("[data-board]") });
    const caption = section.locator("[aria-live] b");
    await scrollToStep(section, titles.indexOf("Steps"), 0.9);
    await test.expect(caption).toHaveText("Steps", { timeout: 30000 });
    const exit = await exitScroll(section);
    await scrollToStep(section, titles.indexOf("Cells"), 0.02);
    await test.expect(caption).toHaveText("Cells", { timeout: 30000 });
    if (wait) await page.waitForTimeout(wait);
    await instrument(page);
    const cdp = await page.context().newCDPSession(page);
    const send = async (type: "touchStart" | "touchMove" | "touchEnd", y: number) => {
      const at = Date.now();
      await cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x: 195, y }] });
      return Date.now() - at;
    };
    const acks: number[] = [];
    acks.push(await send("touchStart", 804));
    for (let moved = 0; moved < 764; ) {
      moved = Math.min(moved + 50, 764);
      acks.push(await send("touchMove", 804 - moved));
    }
    acks.push(await send("touchEnd", 40));
    await page.waitForTimeout(400);
    const y = await page.evaluate(() => scrollY);
    const log = await page.evaluate(() => (window as unknown as { log: string[] }).log);
    console.log(`PROBE wait=${wait} exit=${exit} y=${y} off=${(y - exit).toFixed(2)} acks=${acks.join(",")}\nPROBE ${log.filter((l) => !l.endsWith(" f") || true).join(" | ")}`);
  });
}
