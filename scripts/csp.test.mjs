import { describe, expect, it } from "vitest";
import { buildPolicy, hashProblem, inlineScriptHashes, sha256 } from "./csp.mjs";

const boot = "document.documentElement.dataset.x=1";

describe("inlineScriptHashes", () => {
  it("hashes inline scripts and skips external ones", () => {
    const html = `<script>${boot}</script><script src="/a.js"></script><script></script>`;
    expect([...inlineScriptHashes(html)]).toEqual([sha256(boot)]);
  });

  it("skips data blocks, which the browser never runs", () => {
    const html = `<script type="application/ld+json">{"@type":"WebSite"}</script><script type="text/javascript">a()</script><script type="module">b()</script>`;
    expect([...inlineScriptHashes(html)]).toEqual([sha256("a()"), sha256("b()")]);
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
