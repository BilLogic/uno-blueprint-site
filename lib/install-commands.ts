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

/** What a copy button puts on the clipboard for a block of commands: one per line. */
export const commandText = (lines: readonly string[]) => lines.join("\n");
