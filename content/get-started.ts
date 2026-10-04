import {
  AGENT_INSTALL_PROMPT,
  DATABASE_PROMPTS,
  INSTALL_COMMANDS,
  INSTALL_NOTES,
  WORKSPACE_FOLDER,
} from "@/lib/install-commands";
import { links } from "./links";

/**
 * A box of commands, one per line, under an optional note that is shown but
 * never copied; or a sentence to hand to an agent.
 */
export type CodeContent =
  | { kind: "commands"; lines: readonly string[]; note?: string }
  | { kind: "prose"; text: string };

const commands = (lines: readonly string[], note?: string): CodeContent =>
  note === undefined ? { kind: "commands", lines } : { kind: "commands", lines, note };

export const getStarted = {
  // The section is where "Get the template" lands.
  id: links.getStarted.href.slice(1),
  titleId: "start-title",
  title: { lead: "Free and open source.", rest: "Uno command to start." },
  sub: "Start with a working template and sample data, then map your own service.",
  copy: { label: "Copy", done: "Copied" },
  install: {
    label: "Install",
    tabsLabel: "Package manager",
    github: { label: "Uno Blueprint on GitHub", link: links.github },
    tabs: [
      { value: "npm", label: "npm", code: commands(INSTALL_COMMANDS.npm) },
      {
        value: "agent",
        label: "agent",
        code: { kind: "prose", text: AGENT_INSTALL_PROMPT },
      },
      { value: "pnpm", label: "pnpm", code: commands(INSTALL_COMMANDS.pnpm) },
      { value: "yarn", label: "yarn", code: commands(INSTALL_COMMANDS.yarn, INSTALL_NOTES.yarn) },
      { value: "bun", label: "bun", code: commands(INSTALL_COMMANDS.bun) },
    ],
  },
  database: {
    label: "Database",
    sub: "Your blueprint lives in your own database. Pick your host and paste the prompt into your agent.",
    tabsLabel: "Database host",
    tabs: [
      { value: "supabase", label: "Supabase", prompt: DATABASE_PROMPTS.supabase },
      { value: "neon", label: "Neon", prompt: DATABASE_PROMPTS.neon },
      { value: "firebase", label: "Firebase", prompt: DATABASE_PROMPTS.firebase },
      { value: "postgres", label: "Postgres", prompt: DATABASE_PROMPTS.postgres },
      { value: "other", label: "Other", prompt: DATABASE_PROMPTS.other },
    ],
  },
  skills: {
    label: "Skills",
    sub: "Add the skills to the coding agent you already use.",
    tabsLabel: "Coding agent",
    // The same four skills in every agent; what differs is how the agent gets them and how one is called.
    tabs: [
      {
        value: "claude-code",
        label: "Claude Code",
        code: commands([
          "claude plugin marketplace add BilLogic/uno-blueprint",
          "claude plugin install ub@ub-marketplace",
        ]),
        note: "Installs the four skills as slash commands, in any project.",
        prefix: "/",
      },
      {
        value: "cursor",
        label: "Cursor",
        code: commands([`cd ${WORKSPACE_FOLDER}`, "cursor ."]),
        note: "Cursor reads AGENTS.md in the workspace, which routes each skill name to its instructions. Ask for a skill by name.",
        prefix: "",
      },
      {
        value: "codex",
        label: "Codex",
        code: commands([`cd ${WORKSPACE_FOLDER}`, "codex"]),
        note: "Codex reads AGENTS.md in the workspace, which routes each skill name to its instructions. Ask for a skill by name.",
        prefix: "",
      },
      {
        value: "other",
        label: "Other agents",
        code: commands(["Read AGENTS.md in this folder and follow its skill routing."]),
        note: "Any agent that reads markdown can run the skills. Start it in the workspace and give it this line.",
        prefix: "",
      },
    ],
    list: [
      { name: "ub:map", does: "Draft a blueprint from your docs." },
      { name: "ub:slice", does: "Cut a view for one audience." },
      { name: "ub:audit", does: "List gaps, conflicts and stale sources." },
      { name: "ub:whatif", does: "Trace a change before you make it." },
    ],
  },
  prompts: {
    label: "Prompts",
    sub: "Describe what you want, and let your coding agent do the work.",
    list: [
      {
        title: "Map a service from your docs",
        prompt:
          "Read the docs in this folder and draft a blueprint of how we handle repair intake. List what you couldn't find.",
      },
      {
        title: "Gut-check an idea",
        prompt:
          "Could users approve quotes by text instead of a call? Say what the blueprint covers and what it doesn't.",
      },
      {
        title: "Scope a change",
        prompt: "What breaks if users book online instead of walking in? Don't change anything yet.",
      },
      {
        title: "Find what's missing",
        prompt:
          "Audit the repair intake blueprint and list steps with no owner, conflicts and stale sources.",
      },
    ],
  },
} as const;
