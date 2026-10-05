import { describe, expect, it } from "vitest";
import { site } from "@/content/site";
import { CLARITY_DELAY_MS, clarityIdFor, clarityLoader } from "./analytics";

describe("clarityIdFor", () => {
  it("loads Clarity only on a production deploy", () => {
    expect(clarityIdFor("production")).toBe(site.clarityId);
  });

  it("loads nothing on previews, branch deploys, CI and local builds", () => {
    for (const context of ["deploy-preview", "branch-deploy", "dev", "", undefined]) {
      expect(clarityIdFor(context)).toBeNull();
    }
  });
});

describe("clarityLoader", () => {
  it("requests the project's tag after load, on first input or a delay, when idle", () => {
    const script = clarityLoader("abc123");
    expect(script).toContain('"https://www.clarity.ms/tag/abc123"');
    expect(script).toMatch(/addEventListener\("load"/);
    expect(script).toContain(`setTimeout(g,${CLARITY_DELAY_MS})`);
    expect(script).toContain("requestIdleCallback");
  });

  it("parses as a script", () => {
    expect(() => new Function(clarityLoader(site.clarityId))).not.toThrow();
  });
});
