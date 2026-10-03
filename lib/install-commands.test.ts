import { describe, expect, it } from "vitest";
import { INSTALL_COMMANDS, commandText } from "./install-commands";

describe("INSTALL_COMMANDS", () => {
  it("holds the verified command for each package manager", () => {
    expect(INSTALL_COMMANDS).toEqual({
      npm: ["npm create uno-blueprint@latest", "cd uno-blueprint", "npm run dev"],
      pnpm: ["pnpm create uno-blueprint", "cd uno-blueprint", "pnpm dev"],
      yarn: ["yarn create uno-blueprint", "cd uno-blueprint", "yarn dev"],
      bun: ["bun create uno-blueprint", "cd uno-blueprint", "bun dev"],
    });
  });

  it("starts every line with the command itself, never a prompt glyph", () => {
    for (const line of Object.values(INSTALL_COMMANDS).flat()) {
      expect(line).toMatch(/^[a-z]/);
      expect(line).toBe(line.trim());
    }
  });
});

describe("commandText", () => {
  it("puts one command on each line, with no trailing newline", () => {
    expect(commandText(["a b", "c"])).toBe("a b\nc");
    expect(commandText(INSTALL_COMMANDS.npm)).toBe(
      "npm create uno-blueprint@latest\ncd uno-blueprint\nnpm run dev",
    );
  });
});
