import { describe, expect, it } from "vitest";
import { cssMs } from "./css-time";

describe("cssMs", () => {
  it("reads a CSS time token in ms or s, and an unset one as 0", () => {
    expect(cssMs("700ms")).toBe(700);
    expect(cssMs(" 0.65s")).toBe(650);
    expect(cssMs("")).toBe(0);
  });
});
