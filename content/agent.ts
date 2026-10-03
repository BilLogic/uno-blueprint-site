import { readFileSync } from "node:fs";
import { join } from "node:path";
import { view } from "@/content/view";

/**
 * The agent guide. `public/` serves the file as it is, and the agent view shows
 * the same file, read once at build time, so the two can never disagree.
 * Server-only: it reads the disk, so no client component may import it.
 */
export const agentGuide = readFileSync(join(process.cwd(), "public", view.agentFile), "utf8").trimEnd();
