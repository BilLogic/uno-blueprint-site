export type ProofMetric = {
  name: string;
  /** Without the blueprint, then with it. */
  values: readonly [number, number];
  /** The value a full-height bar stands for. */
  scale: number;
  unit: string;
  /** The gain, shown under the pair. */
  delta: string;
  /** Which way the gain points; for token use, less is better. */
  direction: "up" | "down";
  definition: string;
};

export const proof = {
  lead: "Same agent, same sources.",
  headline: "Better answers with a map.",
  sub: "Early results from a real service: the same questions, asked with and without the blueprint.",
  series: ["Without blueprint", "With blueprint"],
  metrics: [
    {
      name: "Accuracy",
      values: [29, 71],
      scale: 100,
      unit: "%",
      delta: "+42 pts",
      direction: "up",
      definition:
        "Of the questions the documents can answer, the share the agent got right against a written answer key.",
    },
    {
      name: "Gap detection",
      values: [45, 82],
      scale: 100,
      unit: "%",
      delta: "+37 pts",
      direction: "up",
      definition:
        "Of the questions the documents cannot answer, how often the agent said so instead of inventing an answer.",
    },
    {
      name: "Citation precision",
      values: [68, 81],
      scale: 100,
      unit: "%",
      delta: "+13 pts",
      direction: "up",
      definition: "The share of cited sources that support the claim they are attached to.",
    },
    {
      name: "Token use",
      values: [162, 108],
      scale: 180,
      unit: "k",
      delta: "−33%",
      direction: "down",
      definition:
        "The median amount of text the agent read to reach an answer, in tokens. Lower is better.",
    },
  ],
} as const satisfies {
  lead: string;
  headline: string;
  sub: string;
  series: readonly [string, string];
  metrics: readonly ProofMetric[];
};
