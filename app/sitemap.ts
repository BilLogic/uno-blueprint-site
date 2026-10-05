import type { MetadataRoute } from "next";
import { site } from "@/content/site";
import { sitemapEntries } from "@/lib/robots";

// The static export writes this once, at build time, as out/sitemap.xml.
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return sitemapEntries(site.url);
}
