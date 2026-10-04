import { expect, test, type Locator, type Page } from "@playwright/test";

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
      return (await page.getByRole("tabpanel", { name, exact: true }).boundingBox())?.height;
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
  });
});

test.describe("database", () => {
  test("each host's tab copies its own prompt, and keys stay in .env", async ({ page }) => {
    await page.goto("/");
    const tabs = page.getByRole("tablist", { name: "Database host" });
    await expect(tabs.getByRole("tab")).toHaveText(["Supabase", "Neon", "Firebase", "Postgres", "Other"]);
    for (const [host, start] of [
      ["Supabase", "Connect this Uno Blueprint workspace to a Supabase project"],
      ["Neon", "Connect this Uno Blueprint workspace to a Neon Postgres database"],
      ["Firebase", "Connect this Uno Blueprint workspace to Firebase Data Connect"],
      ["Postgres", "Connect this Uno Blueprint workspace to our own Postgres database"],
    ] as const) {
      await tabs.getByRole("tab", { name: host, exact: true }).click();
      const copied = await copyFrom(page, page.getByRole("tabpanel", { name: host, exact: true }));
      expect(copied.startsWith(start)).toBe(true);
      expect(copied).toContain("Keep every key and connection string in .env, never in a tracked file.");
    }
    await tabs.getByRole("tab", { name: "Other", exact: true }).click();
    expect(await copyFrom(page, page.getByRole("tabpanel", { name: "Other", exact: true }))).toMatch(
      /^I want to run this Uno Blueprint workspace on \[our database\]\. .* propose a plan before you change anything\.$/,
    );
  });

  test("the arrow keys move along the hosts", async ({ page }) => {
    await page.goto("/");
    const supabase = page.getByRole("tab", { name: "Supabase", exact: true });
    await expect(supabase).toHaveAttribute("aria-selected", "true");
    await supabase.focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("tab", { name: "Neon", exact: true })).toBeFocused();
    await expect(page.getByRole("tabpanel", { name: "Neon", exact: true })).toBeVisible();
    await page.keyboard.press("End");
    await expect(page.getByRole("tabpanel", { name: "Other", exact: true })).toBeVisible();
    await page.keyboard.press("ArrowRight");
    await expect(supabase).toHaveAttribute("aria-selected", "true");
    await expect(supabase).toBeFocused();
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
