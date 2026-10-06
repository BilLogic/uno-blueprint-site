import { expect, test, type Locator, type Page } from "@playwright/test";
import { getStarted } from "@/content/get-started";

test.use({ permissions: ["clipboard-read", "clipboard-write"] });

const clipboard = (page: Page) => page.evaluate(() => navigator.clipboard.readText());

async function copyFrom(page: Page, box: Locator) {
  await box.hover();
  await box.getByRole("button", { name: "Copy" }).click();
  await expect(box.getByRole("status")).toHaveText("Copied");
  return clipboard(page);
}

test.describe("install", () => {
  test("each package manager's tab shows and copies its own commands", async ({ page }) => {
    await page.goto("/");
    const tabs = page.getByRole("tablist", { name: "Package manager" });
    const panel = page.getByRole("tabpanel", { name: "npm", exact: true });
    expect(await copyFrom(page, panel)).toBe(
      "npm create uno-blueprint@latest\ncd uno-blueprint\nnpm run dev",
    );

    await tabs.getByRole("tab", { name: "pnpm", exact: true }).click();
    expect(await copyFrom(page, page.getByRole("tabpanel", { name: "pnpm", exact: true }))).toBe(
      "pnpm create uno-blueprint\ncd uno-blueprint\npnpm dev",
    );
    await tabs.getByRole("tab", { name: "yarn", exact: true }).click();
    const yarn = page.getByRole("tabpanel", { name: "yarn", exact: true });
    // The Yarn 1 note is shown as a comment, and left out of the copy so the paste runs as typed.
    await expect(yarn).toContainText(
      "# Yarn 1 (Classic). Yarn 2 and later skip the setup scripts the template needs.",
    );
    expect(await copyFrom(page, yarn)).toBe("yarn create uno-blueprint\ncd uno-blueprint\nyarn dev");
    await tabs.getByRole("tab", { name: "bun", exact: true }).click();
    expect(await copyFrom(page, page.getByRole("tabpanel", { name: "bun", exact: true }))).toBe(
      "bun create uno-blueprint\ncd uno-blueprint\nbun dev",
    );
    await tabs.getByRole("tab", { name: "agent", exact: true }).click();
    expect(await copyFrom(page, page.getByRole("tabpanel", { name: "agent", exact: true }))).toMatch(
      /^Set up Uno Blueprint for me\. Run npm create uno-blueprint@latest, .* no database to start\.$/,
    );
  });

  test("the arrow keys move along the tabs", async ({ page }) => {
    await page.goto("/");
    const npm = page.getByRole("tab", { name: "npm", exact: true });
    await npm.focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("tab", { name: "agent", exact: true })).toBeFocused();
    await expect(page.getByRole("tabpanel", { name: "agent", exact: true })).toBeVisible();
    await page.keyboard.press("End");
    await expect(page.getByRole("tabpanel", { name: "bun", exact: true })).toBeVisible();
    await page.keyboard.press("ArrowRight");
    await expect(npm).toHaveAttribute("aria-selected", "true");
  });

  test("the box keeps its height across the package managers", async ({ page }) => {
    await page.goto("/");
    const height = async (name: string) => {
      await page.getByRole("tab", { name, exact: true }).click();
      const panel = page.getByRole("tabpanel", { name, exact: true });
      // Measured at rest: the swap's rise never changes the box's height, but mid-rise its edges sit between
      // pixels, and the measured height can be off by a rounding error.
      await atRest(panel);
      return (await panel.boundingBox())?.height;
    };
    // On a phone the agent's sentence and the Yarn 1 note are taller than the box, which grows for them as in the design.
    for (const [width, names] of [
      [1440, ["npm", "agent", "pnpm", "yarn", "bun"]],
      [390, ["npm", "pnpm", "bun"]],
    ] as const) {
      await page.setViewportSize({ width, height: 900 });
      const heights = [];
      for (const name of names) heights.push(await height(name));
      expect(new Set(heights).size).toBe(1);
    }
    // The yarn box at that width: taller than the others, and its note and commands all inside it.
    const npm = await height("npm");
    const yarn = await height("yarn");
    expect(yarn).toBeGreaterThan(npm ?? Infinity);
    const panel = page.getByRole("tabpanel", { name: "yarn", exact: true });
    expect(await panel.evaluate((box) => box.scrollHeight - box.clientHeight)).toBeLessThanOrEqual(0);
  });
});

test.describe("database", () => {
  test("each host's tab copies its own prompt, and keys stay in .env", async ({ page }) => {
    await page.goto("/");
    const { tabs: hosts, tabsLabel, keepSecrets } = getStarted.database;
    const tabs = page.getByRole("tablist", { name: tabsLabel });
    await expect(tabs.getByRole("tab")).toHaveText(hosts.map((host) => host.label));
    for (const host of hosts) {
      await tabs.getByRole("tab", { name: host.label, exact: true }).click();
      const copied = await copyFrom(page, page.getByRole("tabpanel", { name: host.label, exact: true }));
      expect(copied).toBe(host.prompt);
      if (host.connects) expect(copied).toContain(keepSecrets);
    }
  });

  test("the arrow keys move along the hosts", async ({ page }) => {
    await page.goto("/");
    const hosts = getStarted.database.tabs;
    const [{ label: first }, { label: second }] = hosts;
    const { label: last } = hosts.at(-1) ?? hosts[0];
    const firstTab = page.getByRole("tab", { name: first, exact: true });
    await expect(firstTab).toHaveAttribute("aria-selected", "true");
    await firstTab.focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("tab", { name: second, exact: true })).toBeFocused();
    await expect(page.getByRole("tabpanel", { name: second, exact: true })).toBeVisible();
    await page.keyboard.press("End");
    await expect(page.getByRole("tabpanel", { name: last, exact: true })).toBeVisible();
    await page.keyboard.press("ArrowRight");
    await expect(firstTab).toHaveAttribute("aria-selected", "true");
    await expect(firstTab).toBeFocused();
  });
});

test.describe("skills", () => {
  test("each agent shows its own setup, and a skill copies as that agent calls it", async ({ page }) => {
    await page.goto("/");
    const claude = page.getByRole("tabpanel", { name: "Claude Code", exact: true });
    expect(await copyFrom(page, claude.locator("div").filter({ hasText: "claude plugin marketplace add" }).last())).toBe(
      "claude plugin marketplace add BilLogic/uno-blueprint\nclaude plugin install ub@ub-marketplace",
    );
    expect(await copyFrom(page, claude.getByRole("listitem").filter({ hasText: "ub:audit" }))).toBe(
      "/ub:audit",
    );

    await page.getByRole("tab", { name: "Cursor", exact: true }).click();
    const cursor = page.getByRole("tabpanel", { name: "Cursor", exact: true });
    await expect(cursor).toContainText("Cursor reads AGENTS.md in the workspace");
    expect(await copyFrom(page, cursor.locator("div").filter({ hasText: "cursor ." }).last())).toBe("cd uno-blueprint\ncursor .");
    expect(await copyFrom(page, cursor.getByRole("listitem").filter({ hasText: "ub:whatif" }))).toBe(
      "ub:whatif",
    );
  });
});

/**
 * Holds the panel's own animations `ms` into their run, and reads how it looks
 * there. The browser runs CSS animations on its own time, which the page's
 * clock does not hold, so each one is paused and set to that moment.
 */
async function holdSwap(panel: Locator, ms: number) {
  return panel.evaluate((element, ms) => {
    const running = element.getAnimations();
    let duration = 0;
    for (const animation of running) {
      duration = Number(animation.effect?.getComputedTiming().duration);
      animation.pause();
      animation.currentTime = ms;
    }
    const style = getComputedStyle(element);
    const blur = /blur\(([\d.]+)px\)/.exec(style.filter)?.[1];
    return {
      running: running.length,
      duration,
      marked: element.hasAttribute("data-tab-swap"),
      animationName: style.animationName,
      opacity: Number(style.opacity),
      rise: new DOMMatrix(style.transform === "none" ? undefined : style.transform).m42,
      blur: blur === undefined ? 0 : Number(blur),
    };
  }, ms);
}

/** Lets the panel's animations run out, then reads how it looks at rest. */
const atRest = (panel: Locator) =>
  panel.evaluate(async (element) => {
    for (const animation of element.getAnimations()) animation.play();
    await Promise.allSettled(element.getAnimations().map((animation) => animation.finished));
    const style = getComputedStyle(element);
    return { opacity: style.opacity, transform: style.transform, filter: style.filter };
  });

const rest = { opacity: "1", transform: "none", filter: "none" };
const still = { running: 0, opacity: 1, rise: 0, blur: 0 };

/** A third of the way into the swap the panel is still faint, low and soft: the arrival reads as motion. */
async function expectMidSwap(panel: Locator) {
  const held = await holdSwap(panel, 120);
  expect(held.running).toBe(1);
  expect(held.opacity).toBeLessThan(0.75);
  expect(held.rise).toBeGreaterThan(3);
  expect(held.rise).toBeLessThanOrEqual(8);
  expect(held.blur).toBeGreaterThan(1);
  expect(held.blur).toBeLessThanOrEqual(3);
  return held;
}

test.describe("a tab's panel swap", () => {
  const rows = [
    { name: "install", list: getStarted.install.tabsLabel, tabs: getStarted.install.tabs },
    { name: "database", list: getStarted.database.tabsLabel, tabs: getStarted.database.tabs },
    { name: "skills", list: getStarted.skills.tabsLabel, tabs: getStarted.skills.tabs },
  ] as const;

  for (const { name, list, tabs } of rows) {
    test(`${name}: the new panel rises out of a slight blur and comes to rest sharp`, async ({ page }) => {
      await page.goto("/");
      const [first, second] = tabs;
      // Before any swap the panel is still, and sharp.
      expect(await holdSwap(page.getByRole("tabpanel", { name: first.label, exact: true }), 0)).toMatchObject(still);

      await page.getByRole("tablist", { name: list }).getByRole("tab", { name: second.label, exact: true }).click();
      const panel = page.getByRole("tabpanel", { name: second.label, exact: true });
      const held = await expectMidSwap(panel);
      expect(held.duration).toBeGreaterThanOrEqual(300);
      expect(held.duration).toBeLessThanOrEqual(400);
      expect(await atRest(panel)).toEqual(rest);
    });
  }

  test("picking the tab already shown changes nothing", async ({ page }) => {
    await page.goto("/");
    const npm = page.getByRole("tab", { name: "npm", exact: true });
    const panel = page.getByRole("tabpanel", { name: "npm", exact: true });
    await npm.click();
    expect(await holdSwap(panel, 0)).toMatchObject({ ...still, marked: false });
    // Home on the first tab picks it again.
    await npm.focus();
    await page.keyboard.press("Home");
    expect(await holdSwap(panel, 0)).toMatchObject({ ...still, marked: false });
  });

  test("rapid switching ends on the last tab picked, with one panel showing", async ({ page }) => {
    await page.goto("/");
    const tabs = page.getByRole("tablist", { name: getStarted.install.tabsLabel });
    // Every tab, then back to the first, all inside one swap's time; the panels are counted once each pick is drawn.
    const picks = [...getStarted.install.tabs.slice(1), getStarted.install.tabs[0]].map(({ value }) => value);
    const seen = await tabs.evaluate(async (list, picks) => {
      const shown = [];
      for (const value of picks) {
        list.querySelector<HTMLElement>(`#install-tab-${value}`)?.click();
        await new Promise((frame) => requestAnimationFrame(frame));
        shown.push([...document.querySelectorAll('[role="tabpanel"][id^="install-panel-"]')].map((panel) => panel.id));
      }
      return shown;
    }, picks);
    expect(seen).toEqual(picks.map((value) => [`install-panel-${value}`]));
    // The last pick arrives with the swap's motion, from its start.
    const last = page.getByRole("tabpanel", { name: getStarted.install.tabs[0].label, exact: true });
    await expectMidSwap(last);
    expect(await atRest(last)).toEqual(rest);
  });

  test("the copy button copies the new tab's text mid-swap", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("tab", { name: "pnpm", exact: true }).click();
    const panel = page.getByRole("tabpanel", { name: "pnpm", exact: true });
    await expectMidSwap(panel);
    expect(await copyFrom(page, panel)).toBe("pnpm create uno-blueprint\ncd uno-blueprint\npnpm dev");
  });

  test("a settled panel does not play the swap again when the page comes back from the agent view", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await page.getByRole("tab", { name: "pnpm", exact: true }).click();
    const panel = page.getByRole("tabpanel", { name: "pnpm", exact: true });
    expect(await atRest(panel)).toEqual(rest);
    await expect(panel).not.toHaveAttribute("data-tab-swap");

    await page.getByRole("button", { name: "For agents" }).click();
    await expect(panel).toBeHidden();
    await page.getByRole("button", { name: "For humans" }).click();
    await expect(panel).toBeVisible();
    expect(await holdSwap(panel, 0)).toMatchObject(still);
  });

  test("with reduced motion the panel swaps at once", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.getByRole("tab", { name: "Cursor", exact: true }).click();
    // Read straight after the click, without waiting: marked as a swap, yet nothing plays.
    expect(await holdSwap(page.getByRole("tabpanel", { name: "Cursor", exact: true }), 120)).toMatchObject({
      ...still,
      marked: true,
      animationName: "none",
    });
  });
});

test("a code box's copy button shows on hover or focus, and stays hidden otherwise", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const box = page.getByRole("tabpanel", { name: "npm", exact: true });
  const copy = box.getByRole("button", { name: "Copy" });
  await expect(copy).toHaveCSS("opacity", "0");
  await box.hover();
  await expect(copy).toHaveCSS("opacity", "1");
  await page.mouse.move(0, 0);
  await expect(copy).toHaveCSS("opacity", "0");
  await copy.focus();
  await expect(copy).toHaveCSS("opacity", "1");
});

test.describe("on a touch screen", () => {
  test.use({ viewport: { width: 390, height: 900 }, hasTouch: true, isMobile: true });

  test("a code box's copy button always shows", async ({ page }) => {
    await page.goto("/");
    const copy = page.getByRole("tabpanel", { name: "npm", exact: true }).getByRole("button", { name: "Copy" });
    await expect(copy).toHaveCSS("opacity", "1");
  });
});

test("a prompt copies exactly as written", async ({ page }) => {
  await page.goto("/");
  const prompt = page
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { name: "Scope a change" }) });
  expect(await copyFrom(page, prompt)).toBe(
    "What breaks if users book online instead of walking in? Don't change anything yet.",
  );
});

test.describe("questions", () => {
  test("a question opens and closes from the keyboard", async ({ page }) => {
    await page.goto("/");
    const question = page.getByRole("button", { name: "Does my data become public?" });
    const answer = page.getByText("No. The code is open source; your blueprint lives in your own database.");
    await expect(question).toHaveAttribute("aria-expanded", "false");
    await expect(answer).toBeHidden();

    await question.focus();
    await page.keyboard.press("Enter");
    await expect(question).toHaveAttribute("aria-expanded", "true");
    await expect(answer).toBeVisible();

    await page.keyboard.press("Space");
    await expect(question).toHaveAttribute("aria-expanded", "false");
    await expect(answer).toBeHidden();
  });

  test("with reduced motion an answer is open at once", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.getByRole("button", { name: "Why “Uno”?" }).click();
    const answer = page.getByText("Uno means one.");
    // Read straight after the click, without waiting: there is no transition to wait for.
    expect(await answer.evaluate((p) => getComputedStyle(p).opacity)).toBe("1");
  });
});

test("the closing band leads back to the install steps", async ({ page }) => {
  await page.goto("/");
  const band = page.getByRole("region", { name: "Uno map for your human and AI teammates." });
  await expect(band.getByRole("link", { name: "Get the template" })).toHaveAttribute("href", "#start");
  await expect(band.getByRole("link", { name: "Try the demo" })).toHaveAttribute("href", /\/demo\/$/);
});

test("the longest commands and answers still fit a 375 px screen", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await page.getByRole("tab", { name: "agent", exact: true }).click();
  await page.getByRole("tab", { name: "Postgres", exact: true }).click();
  await page.getByRole("tab", { name: "Other agents", exact: true }).click();
  await page.getByRole("button", { name: "Which agents can use it?" }).click();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
