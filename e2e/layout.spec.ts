import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { questions } from "@/content/questions";
import { site } from "@/content/site";
import { view } from "@/content/view";

test("nothing is wider than a 375 px screen", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("the page loads without console errors or policy violations", async ({ page }) => {
  const problems: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") problems.push(message.text());
  });
  page.on("pageerror", (error) => problems.push(error.message));

  await page.goto("/");
  await page.getByRole("button", { name: "Toggle theme" }).click();
  await page.getByRole("menuitemradio", { name: "Dark" }).click();
  expect(problems).toEqual([]);
});

test("the head describes the page for search and link previews", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(site.title);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", site.description);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `${site.url}/`);
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", site.share.title);
  await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute("content", site.share.title);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /^https:\/\//);
  await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute("content", /.+/);
  await expect(page.locator('link[rel="icon"]').first()).toHaveAttribute("href", /.+/);
});

test("the head carries the site, its source code and its questions as structured data", async ({ page }) => {
  await page.goto("/");
  const text = await page.locator('head script[type="application/ld+json"]').textContent();
  const graph: { "@type": string; mainEntity?: { name: string; acceptedAnswer: { text: string } }[] }[] =
    JSON.parse(text ?? "{}")["@graph"] ?? [];
  expect(graph.map((node) => node["@type"])).toEqual(["WebSite", "SoftwareSourceCode", "FAQPage"]);
  const faq = graph.find((node) => node["@type"] === "FAQPage")?.mainEntity ?? [];
  expect(faq.map((entry) => entry.name)).toEqual(questions.list.map((entry) => entry.question));
  expect(faq.every((entry) => entry.acceptedAnswer.text.length > 0 && !/[<>]/.test(entry.acceptedAnswer.text))).toBe(true);
});

test("answer engines find the whole agent guide in llms-full.txt, linked from llms.txt", async ({ request }) => {
  const full = await request.get("/llms-full.txt");
  expect(full.ok()).toBe(true);
  const text = await full.text();
  expect(text.startsWith("# Uno Blueprint\n")).toBe(true);
  for (const skill of ["ub:map", "ub:slice", "ub:audit", "ub:whatif"]) expect(text).toContain(skill);
  expect(text.trimEnd()).toBe((await (await request.get(`/${view.agentFile}`)).text()).trimEnd());
  expect(await (await request.get("/llms.txt")).text()).toContain(`${site.url}/llms-full.txt`);
});

test("crawlers find a robots file that allows them and a sitemap", async ({ request }) => {
  const robots = await request.get("/robots.txt");
  expect(robots.ok()).toBe(true);
  const rules = await robots.text();
  expect(rules).not.toMatch(/Disallow: \//);
  for (const crawler of ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended"]) expect(rules).toContain(crawler);
  expect(rules).toContain(`Sitemap: ${site.url}/sitemap.xml`);
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBe(true);
  expect(await sitemap.text()).toContain(`<loc>${site.url}/</loc>`);
});

test("the page is served with the generated content security policy", async ({ page }) => {
  const response = await page.goto("/");
  const policy = response?.headers()["content-security-policy"] ?? "";
  expect(policy).toMatch(/script-src 'self'( 'sha256-[^']+')+;/);
  expect(policy).not.toMatch(/script-src[^;]*unsafe-inline/);
  expect(policy).toContain("frame-ancestors 'none'");
});

test("a link that is not ready yet cannot be followed", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const caseStudy = page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Case study", exact: true });
  await expect(caseStudy).toHaveAttribute("aria-disabled", "true");
  await expect(caseStudy).not.toHaveAttribute("href", /.*/);
  await expect(caseStudy).toHaveCSS("cursor", "not-allowed");
  await expect(page.getByRole("link", { name: "Demo", exact: true })).toHaveAttribute("href", /\/demo\/$/);
});

test("the footer credits link to each author's LinkedIn profile", async ({ page }) => {
  await page.goto("/");
  const footer = page.getByRole("contentinfo");
  await expect(footer.getByRole("link", { name: "Bill Guo", exact: true })).toHaveAttribute(
    "href",
    "https://www.linkedin.com/in/boyuang/",
  );
  await expect(footer.getByRole("link", { name: "Meryem Marasli", exact: true })).toHaveAttribute(
    "href",
    "https://www.linkedin.com/in/meryemmarasli/",
  );
});

// Every link whose target is not ready yet: the nav's, and the case card's button.
const notReady = [
  { where: "in the nav", find: (page: Page) => page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Case study", exact: true }) },
  { where: "on the case card", find: (page: Page) => page.locator("#ideas").getByRole("link", { name: "Case study coming soon" }) },
];

for (const { where, find } of notReady) {
  for (const colorScheme of ["light", "dark"] as const) {
    test(`a link that is not ready yet ${where} looks disabled and says Coming soon in ${colorScheme}`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      // Reduced motion, as in the page-wide axe check, so axe never reads a section mid-fade.
      await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
      await page.goto("/");
      const link = find(page);
      await expect(link).toHaveAttribute("aria-disabled", "true");
      await expect(link).not.toHaveAttribute("href", /.*/);
      await expect(link).toHaveAccessibleDescription("Coming soon");
      const tip = page.locator(`[id="${await link.getAttribute("aria-describedby")}"]`);
      await expect(tip).toHaveRole("tooltip");
      await expect(tip).toHaveText("Coming soon");

      // The disabled look: half opacity, muted text, a not-allowed cursor.
      await expect(link).toHaveCSS("opacity", "0.5");
      await expect(link).toHaveCSS("cursor", "not-allowed");
      const muted = await link.evaluate((el) => {
        const probe = document.createElement("span");
        probe.style.color = "var(--color-muted)";
        el.append(probe);
        const color = getComputedStyle(probe).color;
        probe.remove();
        return color;
      });
      await expect(link).toHaveCSS("color", muted);

      // At rest no tooltip shows. Playwright counts a transparent element as visible, so this reads opacity.
      await expect(tip).toHaveCSS("opacity", "0");
      const rest = await link.evaluate((el) => {
        const style = getComputedStyle(el);
        return [style.color, style.backgroundColor, style.borderColor];
      });

      // Hovering it changes nothing on it but shows the tooltip.
      await link.hover();
      await expect(tip).toHaveCSS("opacity", "1");
      expect(
        await link.evaluate((el) => {
          const style = getComputedStyle(el);
          return [style.color, style.backgroundColor, style.borderColor];
        }),
      ).toEqual(rest);

      // Clicking it goes nowhere. Playwright will not click a disabled element unless forced.
      const url = page.url();
      await link.click({ force: true });
      expect(page.url()).toBe(url);

      await page.mouse.move(0, 0);
      await link.blur();
      await expect(tip).toHaveCSS("opacity", "0");
      await link.focus();
      await expect(tip).toHaveCSS("opacity", "1");

      // With the tooltip showing, the page passes axe.
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations).toEqual([]);
    });
  }
}

test("on a phone, the case card's link that is not ready yet looks disabled too", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const link = page.locator("#ideas").getByRole("link", { name: "Case study coming soon" });
  await expect(link).toHaveAttribute("aria-disabled", "true");
  await expect(link).toHaveCSS("opacity", "0.5");
  await expect(link).toHaveAccessibleDescription("Coming soon");
});
