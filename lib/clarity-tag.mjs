// Plain JavaScript so the build's CSP step (scripts/csp.mjs) can import the same
// address the loader requests (lib/analytics.ts), and spot it in the built pages.

/** Where Clarity serves a project's tag; the project id follows. */
export const CLARITY_TAG_URL = "https://www.clarity.ms/tag/";
