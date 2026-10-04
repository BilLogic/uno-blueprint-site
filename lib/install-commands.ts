/** The folder `create uno-blueprint` makes, which every package manager then enters. */
export const WORKSPACE_FOLDER = "uno-blueprint";

export type PackageManager = "npm" | "pnpm" | "yarn" | "bun";

/**
 * How each package manager starts a workspace and runs it, one command per
 * line, exactly as typed: no prompt glyph, so a copy can be pasted and run.
 */
export const INSTALL_COMMANDS: Record<PackageManager, readonly string[]> = {
  npm: ["npm create uno-blueprint@latest", `cd ${WORKSPACE_FOLDER}`, "npm run dev"],
  pnpm: ["pnpm create uno-blueprint", `cd ${WORKSPACE_FOLDER}`, "pnpm dev"],
  yarn: ["yarn create uno-blueprint", `cd ${WORKSPACE_FOLDER}`, "yarn dev"],
  bun: ["bun create uno-blueprint", `cd ${WORKSPACE_FOLDER}`, "bun dev"],
};

/** A caveat shown above a package manager's commands; it is read, never copied. */
export const INSTALL_NOTES = {
  yarn: "Yarn 1 (Classic). Yarn 2 and later skip the setup scripts the template needs.",
} as const satisfies Partial<Record<PackageManager, string>>;

/** A note as it sits in the terminal box: a shell comment. */
export const noteLine = (note: string) => `# ${note}`;

/** What a copy button puts on the clipboard for a block of commands: one per line. */
export const commandText = (lines: readonly string[]) => lines.join("\n");

const [create, enter, run] = INSTALL_COMMANDS.npm;

/** The same start as the npm tab, asked of a coding agent. */
export const AGENT_INSTALL_PROMPT = `Set up Uno Blueprint for me. Run ${create}, then ${enter} and ${run}, and tell me the local address. Read AGENTS.md in the new folder before you change anything. It needs Node 22 or later, and no database to start.`;

export type DatabaseHost = "supabase" | "neon" | "firebase" | "postgres" | "other";

/**
 * Supabase is the reference setup and works as shipped. Any other Postgres
 * takes the portable core plus a small data layer the agent writes against
 * the adapter contract.
 */
const PORTABLE_CORE =
  "Apply supabase/generated/portable-core.generated.sql, which runs on any Postgres. The app reads through Supabase today, so follow references/adapter-contract.md and use the shipped Supabase calls as the worked example to write a small data layer for this host.";
const KEEP_SECRETS = "Keep every key and connection string in .env, never in a tracked file.";

/** A prompt per database host, for the reader to paste into their coding agent. */
export const DATABASE_PROMPTS: Record<DatabaseHost, string> = {
  supabase: `Connect this Uno Blueprint workspace to a Supabase project, following SETUP.md from step 3. I will create the project and give you its URL and anon key. ${KEEP_SECRETS} Link the project, push the migrations and load the seed, then run npm run check:target and show me the schema version it reports.`,
  neon: `Connect this Uno Blueprint workspace to a Neon Postgres database. ${PORTABLE_CORE} ${KEEP_SECRETS} Then show me the app reading the blueprint from Neon.`,
  firebase: `Connect this Uno Blueprint workspace to Firebase Data Connect, which runs on Cloud SQL for Postgres. ${PORTABLE_CORE} ${KEEP_SECRETS} Then show me the app reading the blueprint from Firebase.`,
  postgres: `Connect this Uno Blueprint workspace to our own Postgres database (self-hosted, RDS, Railway or similar). ${PORTABLE_CORE} ${KEEP_SECRETS} Then show me the app reading the blueprint from it.`,
  other:
    "I want to run this Uno Blueprint workspace on [our database]. Read the README section on the portable Postgres core and references/adapter-contract.md, tell me whether [our database] can meet that contract, and propose a plan before you change anything.",
};
