import { expect, test, type Page } from "@playwright/test";

const pictureName = /^Documents from Notion, Slack, Figma, GitHub, Google Drive, Zoom, email and spreadsheets/;
const picture = (page: Page) => page.getByRole("img", { name: pictureName });

test("the hero says what the toolkit is and offers two ways in", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "Get your human and AI teammates on the same page." }),
  ).toBeVisible();
  await expect(
    page.getByText("An open-source toolkit for context engineering: a canvas for your team, a harness for your agents."),
  ).toBeVisible();
  const hero = page.locator("main section").first();
  await expect(hero.getByRole("link", { name: "Get the template" })).toHaveAttribute("href", "#start");
  await expect(hero.getByRole("link", { name: "Try the demo" })).toHaveAttribute("href", /\/demo\/$/);
});

test("the picture is one image with a description", async ({ page }) => {
  await page.goto("/");
  await expect(picture(page)).toBeVisible();
});

test("with reduced motion the picture shows the finished board and holds still", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const image = picture(page);
  await expect(image.getByText("Built", { exact: true })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  // Settled once the projection into the panel is drawn.
  await expect(image.locator("polygon")).toHaveAttribute("points", /\d/);
  const before = await image.screenshot({ animations: "disabled" });
  await page.waitForTimeout(2500);
  const after = await image.screenshot({ animations: "disabled" });
  expect(after.equals(before), "the picture changed").toBe(true);
});

test("without reduced motion the picture plays", async ({ page }) => {
  await page.goto("/");
  const image = picture(page);
  await image.scrollIntoViewIfNeeded();
  const first = await image.screenshot();
  await expect.poll(async () => (await image.screenshot()).equals(first), { timeout: 6000 }).toBe(false);
});

test.describe("the panel keeps the rows its width can hold", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
  });

  test("all of them on a wide screen", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const image = picture(page);
    for (const label of ["Summary", "Status", "Owner", "Value proposition", "Evidence", "Follows", "Leads to"]) {
      await expect(image.getByText(label, { exact: true })).toBeVisible();
    }
  });

  test("no value proposition or next steps below 1100 px", async ({ page }) => {
    await page.setViewportSize({ width: 1000, height: 900 });
    await page.goto("/");
    const image = picture(page);
    await expect(image.getByText("Evidence", { exact: true })).toBeVisible();
    for (const label of ["Value proposition", "Follows", "Leads to"]) {
      await expect(image.getByText(label, { exact: true })).toBeHidden();
    }
  });

  test("Status and Owner stacked, and no value proposition, when the panel is narrow", async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 900 });
    await page.goto("/");
    const image = picture(page);
    const status = await image.getByText("Status", { exact: true }).boundingBox();
    const owner = await image.getByText("Owner", { exact: true }).boundingBox();
    expect(owner!.y).toBeGreaterThan(status!.y + status!.height);
    expect(Math.abs(owner!.x - status!.x)).toBeLessThan(1);
    await expect(image.getByText("Value proposition", { exact: true })).toBeHidden();
  });

  test("none on a phone, which shows the board alone", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const image = picture(page);
    await expect(image.getByText("Scenario", { exact: true })).toBeVisible();
    for (const label of ["Summary", "Status", "Owner", "Evidence"]) {
      await expect(image.getByText(label, { exact: true })).toBeHidden();
    }
    await expect(image.locator("polygon")).toBeHidden();
  });
});

test("the logo is square at every width, in both themes", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const colorScheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme });
    await page.setViewportSize({ width: 1700, height: 900 });
    await page.goto("/");
    const mark = picture(page).locator("img:visible");
    for (let width = 360; width <= 1700; width += 20) {
      await page.setViewportSize({ width, height: 900 });
      const box = (await mark.boundingBox())!;
      expect(Math.abs(box.width - box.height), `${colorScheme} at ${width} px`).toBeLessThan(0.5);
    }
  }
});

test("each loop opens on the board alone, grown into the panel's room", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const image = picture(page);
  await image.scrollIntoViewIfNeeded();
  const panel = image.locator(".\\@container");
  await expect.poll(() => panel.evaluate((element) => getComputedStyle(element).opacity), { timeout: 8000 }).toBe("0");
  const board = image.locator(".origin-left");
  await expect
    .poll(() => board.evaluate((element) => Number(getComputedStyle(element).scale)), { timeout: 2000 })
    .toBeGreaterThan(1.2);
});

for (const width of [1440, 390]) {
  test(`at ${width} px the people and agents only stop on a cell, a tool or a panel field`, async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const image = picture(page);
    await image.scrollIntoViewIfNeeded();
    const strays = await image.evaluate(
      (root) =>
        new Promise<string[]>((resolve) => {
          const stage = root.querySelector(".grid")!;
          const children = Array.from(stage.children) as HTMLElement[];
          const walkers = children.filter((child) => child.classList.contains("z-30"));
          const panel = children.find((child) => child.classList.contains("@container"))!;
          const targets = () => {
            const shown = (element: Element) => element.getBoundingClientRect().width > 0;
            const fields =
              getComputedStyle(panel).opacity === "1" ? [panel.querySelector(".rounded-pill")!, panel.querySelector(".gap-1\\.75")!] : [];
            return [...stage.querySelectorAll(".h-13"), ...stage.querySelectorAll("span[title]"), ...fields].filter(shown);
          };
          const overlaps = (a: DOMRect, b: DOMRect) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
          const seen = walkers.map(() => ({ transform: "", since: 0, checked: false }));
          const out: string[] = [];
          const timer = setInterval(() => {
            const now = performance.now();
            walkers.forEach((walker, i) => {
              const last = seen[i]!;
              if (walker.style.transform !== last.transform) {
                seen[i] = { transform: walker.style.transform, since: now, checked: false };
                return;
              }
              if (last.checked || now - last.since < 1000 || !("placed" in walker.dataset)) return;
              last.checked = true;
              const spot = walker.getBoundingClientRect();
              if (!targets().some((target) => overlaps(spot, target.getBoundingClientRect()))) out.push(`${i} at ${last.transform}`);
            });
          }, 100);
          setTimeout(() => {
            clearInterval(timer);
            resolve(out);
          }, 40_000);
        }),
    );
    expect(strays).toEqual([]);
  });
}

for (const width of [800, 900, 1024, 1100, 1180, 1280]) {
  test(`at ${width} px no words in the picture run past their box`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    const overflowing = await picture(page).evaluate((root) => {
      const bordered = (element: Element | null): Element | null => {
        for (let at = element; at && at !== root; at = at.parentElement) {
          const style = getComputedStyle(at);
          if (["Top", "Right", "Bottom", "Left"].some((side) => parseFloat(style.getPropertyValue(`border-${side.toLowerCase()}-width`)) > 0)) return at;
        }
        return root;
      };
      const out: string[] = [];
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (!node.textContent?.trim()) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        const text = range.getBoundingClientRect();
        if (!text.width) continue;
        const box = bordered(node.parentElement)!.getBoundingClientRect();
        if (text.left < box.left - 0.5 || text.right > box.right + 0.5) out.push(node.textContent);
      }
      return out;
    });
    expect(overflowing).toEqual([]);
  });
}
