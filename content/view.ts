import type { View } from "@/lib/view";

/** The two ways to read the page: as people see it, or as the markdown an agent reads. */
export const view = {
  label: "Page format",
  options: [
    { value: "human", label: "Human", switchLabel: "For humans" },
    { value: "agent", label: "Agent", switchLabel: "For agents" },
  ] satisfies readonly { value: View; label: string; switchLabel: string }[],
  agentFile: "uno-blueprint.md",
} as const;
