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

/** A note as it sits in a terminal box: a shell comment, shown but never copied. */
export const noteLine = (note: string) => `# ${note}`;

/** What a copy button puts on the clipboard for a block of commands: one per line. */
export const commandText = (lines: readonly string[]) => lines.join("\n");

/** Commands as one sentence for an agent, however many there are: "a, then b, and c". */
export function runInOrder(lines: readonly string[]): string {
  const [first = "", ...rest] = lines;
  const last = rest.pop();
  if (last === undefined) return first;
  return `${first}, then ${rest.length > 0 ? `${rest.join(", ")}, and ${last}` : last}`;
}

/** A prompt assembled from sentences; a part left out (`false` or `undefined`) is skipped. */
export const sentences = (...parts: readonly (string | false | undefined)[]) =>
  parts.filter((part): part is string => typeof part === "string" && part !== "").join(" ");

/** A list with at least one entry, so its first is always there to fall back on. */
export type NonEmpty<T> = readonly [T, ...T[]];

/** The tab a value selects, or the first tab when none matches. */
export function selectedTab<Tabs extends NonEmpty<{ value: string }>>(tabs: Tabs, value: string): Tabs[number] {
  return tabs.find((tab) => tab.value === value) ?? tabs[0];
}
