import { describe, expect, it } from "vitest";
import { getStarted } from "@/content/get-started";
import { INSTALL_COMMANDS, commandText, noteLine, runInOrder, selectedTab, sentences } from "./get-started";

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

describe("noteLine", () => {
  it("shows a note as a shell comment", () => {
    expect(noteLine("Yarn 1 (Classic).")).toBe("# Yarn 1 (Classic).");
  });
});

describe("commandText", () => {
  it("puts one command on each line, with no trailing newline", () => {
    expect(commandText(["a b", "c"])).toBe("a b\nc");
  });
});

describe("runInOrder", () => {
  it("reads commands as one sentence: the first, then the rest as a list", () => {
    expect(runInOrder(["a"])).toBe("a");
    expect(runInOrder(["a", "b"])).toBe("a, then b");
    expect(runInOrder(["a", "b", "c"])).toBe("a, then b and c");
    expect(runInOrder(["a", "b", "c", "d"])).toBe("a, then b, c and d");
  });
});

describe("sentences", () => {
  it("joins the parts with one space and skips the ones left out", () => {
    expect(sentences("One.", false, "Two.", undefined, "Three.")).toBe(
      "One. Two. Three.",
    );
  });
});

describe("selectedTab", () => {
  const tabs = [{ value: "a" }, { value: "b" }] as const;
  it("finds the tab for a value, and falls back to the first", () => {
    expect(selectedTab(tabs, "b")).toBe(tabs[1]);
    expect(selectedTab(tabs, "z")).toBe(tabs[0]);
  });
});

describe("the get started content", () => {
  it("has the agent run the npm commands, never clone", () => {
    const agent = getStarted.install.tabs.find((tab) => tab.value === "agent");
    if (agent?.code.kind !== "prose") throw new Error("the agent tab holds a prompt");
    for (const command of INSTALL_COMMANDS.npm) expect(agent.code.text).toContain(command);
    expect(agent.code.text).not.toMatch(/clone/i);
  });

  it("keeps keys in .env in every database prompt that connects one", () => {
    const { tabs, keepSecrets } = getStarted.database;
    expect(tabs.some((tab) => !tab.connects)).toBe(true);
    for (const tab of tabs) {
      if (tab.connects) expect(tab.prompt).toContain(keepSecrets);
      else expect(tab.prompt).not.toContain(".env");
    }
  });

  it("gives each database host its own tab and prompt", () => {
    const { tabs } = getStarted.database;
    expect(new Set(tabs.map((tab) => tab.value)).size).toBe(tabs.length);
    expect(new Set(tabs.map((tab) => tab.prompt)).size).toBe(tabs.length);
  });
});
