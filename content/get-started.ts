import { INSTALL_COMMANDS, WORKSPACE_FOLDER } from "@/lib/install-commands";
import { links } from "./links";

/** A box of commands, one per line, or a sentence to hand to an agent. */
export type CodeContent = { kind: "commands"; lines: readonly string[] } | { kind: "prose"; text: string };

const commands = (lines: readonly string[]): CodeContent => ({ kind: "commands", lines });

export const getStarted = {
  // The section is where "Get the template" lands.
  id: links.getStarted.href.slice(1),
  titleId: "start-title",
  title: { lead: "Free and open source.", rest: "Uno command to start." },
  sub: "MIT licensed. Run it locally with no database, then host it on your own database.",
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
        code: {
          kind: "prose",
          text: `Set up Uno Blueprint for me. Clone ${links.github.href} and read its README.md and AGENTS.md first. Then run npm install and npm run dev, and tell me the local address. It needs Node 22 or later, and no database to start.`,
        },
      },
      { value: "pnpm", label: "pnpm", code: commands(INSTALL_COMMANDS.pnpm) },
      { value: "yarn", label: "yarn 1", code: commands(INSTALL_COMMANDS.yarn) },
      { value: "bun", label: "bun", code: commands(INSTALL_COMMANDS.bun) },
    ],
  },
  skills: {
    label: "Skills",
    sub: "Four skills, run from your coding agent.",
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
    sub: "Or say what you want, and let your agent pick the skill.",
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
