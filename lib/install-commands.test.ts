import { describe, expect, it } from "vitest";
import {
  AGENT_INSTALL_PROMPT,
  DATABASE_PROMPTS,
  INSTALL_COMMANDS,
  INSTALL_NOTES,
  commandText,
  noteLine,
} from "./install-commands";

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

describe("INSTALL_NOTES", () => {
  it("tells a yarn user that only Yarn 1 runs the template's setup scripts", () => {
    expect(INSTALL_NOTES).toEqual({
      yarn: "Yarn 1 (Classic). Yarn 2 and later skip the setup scripts the template needs.",
    });
  });

  it("shows a note as a shell comment", () => {
    expect(noteLine("Yarn 1 (Classic).")).toBe("# Yarn 1 (Classic).");
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

describe("AGENT_INSTALL_PROMPT", () => {
  it("has the agent run the initialiser rather than clone the repository", () => {
    expect(AGENT_INSTALL_PROMPT).toBe(
      "Set up Uno Blueprint for me. Run npm create uno-blueprint@latest, then cd uno-blueprint and npm run dev, and tell me the local address. Read AGENTS.md in the new folder before you change anything. It needs Node 22 or later, and no database to start.",
    );
    for (const command of INSTALL_COMMANDS.npm) expect(AGENT_INSTALL_PROMPT).toContain(command);
    expect(AGENT_INSTALL_PROMPT).not.toMatch(/clone/i);
  });
});

describe("DATABASE_PROMPTS", () => {
  const KEEP = "Keep every key and connection string in .env, never in a tracked file.";
  const PORT =
    "Apply supabase/generated/portable-core.generated.sql, which runs on any Postgres. The app reads through Supabase today, so follow references/adapter-contract.md and use the shipped Supabase calls as the worked example to write a small data layer for this host.";

  it("offers the hosts in order, Supabase first as the reference setup", () => {
    expect(Object.keys(DATABASE_PROMPTS)).toEqual(["supabase", "neon", "firebase", "postgres", "other"]);
  });

  it("holds the verified prompt for each host", () => {
    expect(DATABASE_PROMPTS).toEqual({
      supabase: `Connect this Uno Blueprint workspace to a Supabase project, following SETUP.md from step 3. I will create the project and give you its URL and anon key. ${KEEP} Link the project, push the migrations and load the seed, then run npm run check:target and show me the schema version it reports.`,
      neon: `Connect this Uno Blueprint workspace to a Neon Postgres database. ${PORT} ${KEEP} Then show me the app reading the blueprint from Neon.`,
      firebase: `Connect this Uno Blueprint workspace to Firebase Data Connect, which runs on Cloud SQL for Postgres. ${PORT} ${KEEP} Then show me the app reading the blueprint from Firebase.`,
      postgres: `Connect this Uno Blueprint workspace to our own Postgres database (self-hosted, RDS, Railway or similar). ${PORT} ${KEEP} Then show me the app reading the blueprint from it.`,
      other:
        "I want to run this Uno Blueprint workspace on [our database]. Read the README section on the portable Postgres core and references/adapter-contract.md, tell me whether [our database] can meet that contract, and propose a plan before you change anything.",
    });
  });

  it("keeps secrets in .env in every prompt that connects a database", () => {
    const { other, ...connecting } = DATABASE_PROMPTS;
    for (const prompt of Object.values(connecting)) expect(prompt).toContain(KEEP);
    // The last host only asks for a plan, so it never handles a key.
    expect(other).toMatch(/propose a plan before you change anything\.$/);
  });
});
