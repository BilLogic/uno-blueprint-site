import type { MetadataRoute } from "next";

/**
 * Lets every crawler read the whole site. The ones named get a rule of their
 * own, so search and answer engines read the site whatever else changes.
 */
export function robotsRules(origin: string, crawlers: readonly string[]): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/" }, ...crawlers.map((userAgent) => ({ userAgent, allow: "/" }))],
    sitemap: `${origin}/sitemap.xml`,
  };
}

/** The pages worth indexing: the site is one page. */
export function sitemapEntries(origin: string): MetadataRoute.Sitemap {
  return [{ url: `${origin}/`, changeFrequency: "weekly", priority: 1 }];
}
