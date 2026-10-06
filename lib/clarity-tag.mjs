// Plain JavaScript so the build's CSP step (scripts/csp.mjs) and the production
// build check (scripts/check-clarity-build.mjs) can import, through Node, the
// project and address the loader requests (lib/analytics.ts).

/** This site's Microsoft Clarity project. Public: it ships in the page. content/site.ts re-exports it. */
export const CLARITY_ID = "yt5lgkgzpj";

/** Where Clarity serves a project's tag; the project id follows. */
export const CLARITY_TAG_URL = "https://www.clarity.ms/tag/";

/** The localStorage key that marks a browser as the team's own: "off" keeps Clarity out of it. */
export const CLARITY_OPT_OUT_KEY = "ub:clarity";
