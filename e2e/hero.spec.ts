import { expect, test, type Page } from "@playwright/test";

const pictureName = /^Documents from Notion, Slack, Figma, GitHub, Google Drive, Zoom, email, and spreadsheets/;
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
  const panel = image.getByTestId("hero-panel");
  await expect.poll(() => panel.evaluate((element) => getComputedStyle(element).opacity), { timeout: 8000 }).toBe("0");
  const board = image.getByTestId("hero-board");
  await expect
    .poll(() => board.evaluate((element) => Number(getComputedStyle(element).scale)), { timeout: 2000 })
    .toBeGreaterThan(1.2);
});

test("standing alone, the board keeps the same padding on both sides, on load and after a resize", async ({ page }) => {
  const margins = () =>
    picture(page).evaluate((root) => {
      const frame = root.querySelector("[data-testid=hero-frame]")!.getBoundingClientRect();
      const stage = root.querySelector("[data-testid=hero-stage]")!;
      const tools = stage.querySelector("[data-testid=hero-feed]")!.getBoundingClientRect();
      const sheets = Array.from(stage.querySelector("[data-testid=hero-board]")!.children).map((sheet) => sheet.getBoundingClientRect());
      return {
        left: tools.left - frame.left,
        right: frame.right - Math.max(...sheets.map((sheet) => sheet.right)),
        top: Math.min(...sheets.map((sheet) => sheet.top)) - frame.top,
        bottom: frame.bottom - Math.max(...sheets.map((sheet) => sheet.bottom)),
      };
    });
  const panelAway = () =>
    expect
      .poll(() => picture(page).getByTestId("hero-panel").evaluate((panel) => getComputedStyle(panel).opacity), { timeout: 8000 })
      .toBe("0");
  const even = async (label: string) => {
    // The board grows over the solo transition; it settles well within a second.
    await page.waitForTimeout(900);
    const { left, right, top, bottom } = await margins();
    expect(Math.abs(left - right), `${label}: left ${left}, right ${right}`).toBeLessThan(2);
    expect(Math.abs(top - bottom), `${label}: top ${top}, bottom ${bottom}`).toBeLessThan(2);
  };
  for (const width of [960, 1280, 1600]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await picture(page).scrollIntoViewIfNeeded();
    await panelAway();
    await even(`${width} px on load`);
    const resized = width === 1600 ? 1100 : width + 240;
    await page.setViewportSize({ width: resized, height: 900 });
    await even(`${width} px resized to ${resized} px`);
  }
});

test("with the panel showing, the row keeps the same margins on both sides", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [1280, 1600]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const image = picture(page);
    await expect(image.locator("polygon")).toHaveAttribute("points", /\d/);
    const { left, right, top, bottom } = await image.evaluate((root) => {
      const frame = root.querySelector("[data-testid=hero-frame]")!.getBoundingClientRect();
      const feed = root.querySelector("[data-testid=hero-feed]")!.getBoundingClientRect();
      const panel = root.querySelector("[data-testid=hero-panel]")!.getBoundingClientRect();
      return {
        left: feed.left - frame.left,
        right: frame.right - panel.right,
        top: panel.top - frame.top,
        bottom: frame.bottom - panel.bottom,
      };
    });
    expect(Math.abs(left - right), `${width} px: left ${left}, right ${right}`).toBeLessThan(2);
    expect(Math.abs(top - bottom), `${width} px: top ${top}, bottom ${bottom}`).toBeLessThan(2);
  }
});

test("resized from wide to a phone while standing alone, the board goes back to rest", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const image = picture(page);
  await image.scrollIntoViewIfNeeded();
  const solo = (name: string) => image.getByTestId("hero-stage").evaluate((stage, name) => (stage as HTMLElement).style.getPropertyValue(name), name);
  await expect.poll(() => solo("--solo-ty"), { timeout: 8000 }).not.toBe("");
  expect(parseFloat(await solo("--solo-ty"))).toBeGreaterThan(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => solo("--solo-ty")).toBe("0.0px");
  expect(await solo("--solo-s")).toBe("1.000");
  const board = image.getByTestId("hero-board");
  // At rest once the transition ends: no scale, no drop.
  await expect
    .poll(() => board.evaluate((element) => element.getBoundingClientRect().width / (element as HTMLElement).offsetWidth))
    .toBeCloseTo(1, 3);
  expect(["none", "0px", "0px 0px"]).toContain(await board.evaluate((element) => getComputedStyle(element).translate));
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
          const stage = root.querySelector("[data-testid=hero-stage]")!;
          const walkers = Array.from(stage.querySelectorAll<HTMLElement>("[data-testid=hero-walker]"));
          const panel = stage.querySelector<HTMLElement>("[data-testid=hero-panel]")!;
          const shown = (element: Element) => element.getBoundingClientRect().width > 0;
          const fields = Array.from(panel.querySelectorAll("[data-testid=hero-field]"));
          // A field counts only while the panel is open and on screen; standing on one of a closed or hidden panel is a stray.
          const panelOpen = () => shown(panel) && getComputedStyle(panel).opacity === "1";
          const targets = () =>
            [
              ...stage.querySelectorAll("[data-testid=hero-cell]"),
              ...stage.querySelectorAll("[data-testid=hero-tool]"),
              ...(panelOpen() ? fields : []),
            ].filter(shown);
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
              const stranded = walker.dataset.on === "field" && !panelOpen();
              if (stranded || !targets().some((target) => overlaps(spot, target.getBoundingClientRect())))
                out.push(`${i} at ${last.transform}${stranded ? " on a closed panel" : ""}`);
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
