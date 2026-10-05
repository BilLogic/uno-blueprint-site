import type { MetadataRoute } from "next";
import { site } from "@/content/site";
import { robotsRules } from "@/lib/robots";

// The static export writes this once, at build time, as out/robots.txt.
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return robotsRules(site.url, site.crawlers);
}
