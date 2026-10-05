import { agentGuide } from "@/content/agent";

// The static export writes this once, at build time, as out/llms-full.txt.
export const dynamic = "force-static";

/**
 * The whole agent view as one markdown file, for readers that follow the
 * llms.txt convention and want everything in one fetch. It is the agent guide
 * itself, read from the same file, so it can never drift from the view.
 */
export function GET() {
  return new Response(`${agentGuide}\n`, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
