import { describe, expect, it } from "vitest";
import { site } from "@/content/site";
import { robotsRules, sitemapEntries } from "./robots";

describe("robotsRules", () => {
  const robots = robotsRules(site.url, site.crawlers);
  const rules = [robots.rules].flat();

  it("disallows nothing", () => {
    expect(rules.every((rule) => rule.disallow === undefined && rule.allow === "/")).toBe(true);
  });

  it("names the answer engines' crawlers", () => {
    const agents = rules.map((rule) => rule.userAgent);
    for (const crawler of ["*", "GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended"]) expect(agents).toContain(crawler);
  });

  it("points at the sitemap", () => {
    expect(robots.sitemap).toBe("https://uno-blueprint.netlify.app/sitemap.xml");
  });
});

describe("sitemapEntries", () => {
  it("lists the home page", () => {
    expect(sitemapEntries(site.url).map((entry) => entry.url)).toEqual(["https://uno-blueprint.netlify.app/"]);
  });
});
