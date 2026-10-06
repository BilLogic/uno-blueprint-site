import { INSTALL_COMMANDS, WORKSPACE_FOLDER, runInOrder, sentences } from "@/lib/get-started";
import { links } from "./links";

/**
 * A box of commands, one per line, under an optional note that is shown but
 * never copied; or a sentence to hand to an agent.
 */
export type CodeContent =
  | { kind: "commands"; lines: readonly string[]; note?: string }
  | { kind: "prose"; text: string };

const commands = (lines: readonly string[], note?: string): CodeContent =>
  // An optional field rejects an explicit undefined (exactOptionalPropertyTypes), so a block with no note leaves the key out.
  note === undefined ? { kind: "commands", lines } : { kind: "commands", lines, note };

/*
 * Database prompts. Supabase is the reference setup and works as shipped; any
 * other Postgres takes the portable core plus a small data layer the agent
 * writes against the adapter contract.
 */
const KEEP_SECRETS = "Keep every key and connection string in .env, never in a tracked file.";
const PORTABLE_CORE =
  "Apply supabase/generated/portable-core.generated.sql, which runs on any Postgres. The app reads through Supabase today, so follow references/adapter-contract.md and use the shipped Supabase calls as the worked example to write a small data layer for this host.";

/**
 * The hosts in the order their tabs show; adding one is an edit here alone. A
 * host that `connects` hands the agent keys, so its prompt carries the .env
 * sentence; one that only asks for a plan does not.
 */
const databaseHosts = [
  {
    value: "supabase",
    label: "Supabase",
    connects: true,
    prompt: sentences(
      "Connect this Uno Blueprint workspace to a Supabase project, following SETUP.md from step 3. I will create the project and give you its URL and anon key.",
      KEEP_SECRETS,
      "Link the project, push the migrations, and load the seed, then run npm run check:target and show me the schema version it reports.",
    ),
  },
  {
    value: "neon",
    label: "Neon",
    connects: true,
    prompt: sentences(
      "Connect this Uno Blueprint workspace to a Neon Postgres database.",
      PORTABLE_CORE,
      KEEP_SECRETS,
      "Then show me the app reading the blueprint from Neon.",
    ),
  },
  {
    value: "firebase",
    label: "Firebase",
    connects: true,
    prompt: sentences(
      "Connect this Uno Blueprint workspace to Firebase Data Connect, which runs on Cloud SQL for Postgres.",
      PORTABLE_CORE,
      KEEP_SECRETS,
      "Then show me the app reading the blueprint from Firebase.",
    ),
  },
  {
    value: "postgres",
    label: "Postgres",
    connects: true,
    prompt: sentences(
      "Connect this Uno Blueprint workspace to our own Postgres database (self-hosted, RDS, Railway, or similar).",
      PORTABLE_CORE,
      KEEP_SECRETS,
      "Then show me the app reading the blueprint from it.",
    ),
  },
  {
    value: "other",
    label: "Other",
    connects: false,
    prompt:
      "I want to run this Uno Blueprint workspace on [our database]. Read the README section on the portable Postgres core and references/adapter-contract.md, tell me whether [our database] can meet that contract, and propose a plan before you change anything.",
  },
] as const;

export type DatabaseHost = (typeof databaseHosts)[number]["value"];

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
        code: {
          kind: "prose",
          text: `Set up Uno Blueprint for me. Run ${runInOrder(INSTALL_COMMANDS.npm)}, and tell me the local address. Read AGENTS.md in the new folder before you change anything. It needs Node 22 or later, and no database to start.`,
        },
      },
      { value: "pnpm", label: "pnpm", code: commands(INSTALL_COMMANDS.pnpm) },
      {
        value: "yarn",
        label: "yarn",
        code: commands(
          INSTALL_COMMANDS.yarn,
          "Yarn 1 (Classic). Yarn 2 and later skip the setup scripts the template needs.",
        ),
      },
      { value: "bun", label: "bun", code: commands(INSTALL_COMMANDS.bun) },
    ],
  },
  database: {
    label: "Database",
    sub: "Your blueprint lives in your own database. Pick your host and paste the prompt into your agent.",
    tabsLabel: "Database host",
    keepSecrets: KEEP_SECRETS,
    tabs: databaseHosts,
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
      { name: "ub:audit", does: "List gaps, conflicts, and stale sources." },
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
          "Audit the repair intake blueprint and list steps with no owner, conflicts, and stale sources.",
      },
    ],
  },
} as const;
