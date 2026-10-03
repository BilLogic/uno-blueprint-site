import { describe, expect, it } from "vitest";
import { nextMenuIndex, nextTabIndex } from "./menu-keys";

describe("nextMenuIndex", () => {
  it("moves down and wraps to the first item", () => {
    expect(nextMenuIndex("ArrowDown", 0, 3)).toBe(1);
    expect(nextMenuIndex("ArrowDown", 2, 3)).toBe(0);
  });

  it("moves up and wraps to the last item", () => {
    expect(nextMenuIndex("ArrowUp", 1, 3)).toBe(0);
    expect(nextMenuIndex("ArrowUp", 0, 3)).toBe(2);
  });

  it("jumps to either end", () => {
    expect(nextMenuIndex("Home", 2, 3)).toBe(0);
    expect(nextMenuIndex("End", 0, 3)).toBe(2);
  });

  it("ignores other keys and empty menus", () => {
    expect(nextMenuIndex("Tab", 0, 3)).toBeNull();
    expect(nextMenuIndex("ArrowDown", 0, 0)).toBeNull();
  });
});

describe("nextTabIndex", () => {
  it("moves right and wraps to the first tab", () => {
    expect(nextTabIndex("ArrowRight", 0, 4)).toBe(1);
    expect(nextTabIndex("ArrowRight", 3, 4)).toBe(0);
  });

  it("moves left and wraps to the last tab", () => {
    expect(nextTabIndex("ArrowLeft", 1, 4)).toBe(0);
    expect(nextTabIndex("ArrowLeft", 0, 4)).toBe(3);
  });

  it("jumps to either end", () => {
    expect(nextTabIndex("Home", 2, 4)).toBe(0);
    expect(nextTabIndex("End", 0, 4)).toBe(3);
  });

  it("ignores vertical arrows, other keys and empty rows", () => {
    expect(nextTabIndex("ArrowDown", 1, 4)).toBeNull();
    expect(nextTabIndex("Enter", 1, 4)).toBeNull();
    expect(nextTabIndex("ArrowRight", 0, 0)).toBeNull();
  });
});
