import { describe, expect, it } from "vitest";
import { widthChange } from "./viewport-resize";

describe("widthChange", () => {
  it("passes over a resize that leaves the width as it was, as a toolbar hiding does", () => {
    const changed = widthChange(375);
    expect(changed(375)).toBe(false);
    expect(changed(375)).toBe(false);
  });

  it("tells each change of width, measured against the width it last saw", () => {
    const changed = widthChange(375);
    expect(changed(812)).toBe(true);
    expect(changed(812)).toBe(false);
    expect(changed(375)).toBe(true);
    expect(changed(375)).toBe(false);
  });
});
