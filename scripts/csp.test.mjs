import { describe, expect, it } from "vitest";
import { clarityLoader } from "../lib/analytics.ts";
import { buildPolicy, hashProblem, inlineScriptHashes, sha256, usesClarity } from "./csp.mjs";

const boot = "document.documentElement.dataset.x=1";

describe("inlineScriptHashes", () => {
  it("hashes inline scripts and skips external ones", () => {
    const html = `<script>${boot}</script><script src="/a.js"></script><script></script>`;
    expect([...inlineScriptHashes(html)]).toEqual([sha256(boot)]);
  });
});

describe("hashProblem", () => {
  it("fails when the build has no inline scripts", () => {
    expect(hashProblem(new Set(), boot)).toMatch(/no inline scripts/);
  });

  it("fails when the theme boot script is not among them", () => {
    expect(hashProblem(new Set([sha256("other()")]), boot)).toMatch(/boot script/);
  });

  it("passes when the boot script is hashed", () => {
    expect(hashProblem(new Set([sha256(boot)]), boot)).toBeNull();
  });
});

describe("buildPolicy", () => {
  it("allows only hashed inline scripts", () => {
    const policy = buildPolicy(new Set([sha256(boot)]));
    expect(policy).toContain(`script-src 'self' ${sha256(boot)};`);
    expect(policy).not.toMatch(/script-src[^;]*unsafe-inline/);
  });
});

describe("Clarity in the policy", () => {
  it("lists no Clarity hosts when no page loads the tag", () => {
    expect(buildPolicy(new Set([sha256(boot)]))).not.toMatch(/clarity|bing/);
  });

  it("allows Clarity's scripts, beacons and data when a page loads the tag", () => {
    const policy = buildPolicy(new Set([sha256(boot)]), { clarity: true });
    expect(policy).toMatch(/script-src [^;]* https:\/\/www\.clarity\.ms https:\/\/scripts\.clarity\.ms;/);
    expect(policy).not.toMatch(/script-src[^;]*\*/);
    expect(policy).toMatch(/connect-src 'self' https:\/\/\*\.clarity\.ms https:\/\/c\.bing\.com/);
    expect(policy).toMatch(/img-src 'self' data: https:\/\/\*\.clarity\.ms https:\/\/c\.bing\.com/);
    expect(policy).not.toMatch(/script-src[^;]*unsafe-inline/);
  });

  it("spots the tag the loader requests, so the two never drift apart", () => {
    expect(usesClarity(clarityLoader("abc123"))).toBe(true);
  });

  it("spots the tag in a page", () => {
    expect(usesClarity('<script>s.src="https://www.clarity.ms/tag/abc"</script>')).toBe(true);
    expect(usesClarity("<script>boot()</script>")).toBe(false);
  });
});
