/**
 * The what-if picture as a timeline. The skill tries one option after another:
 * each fills its slot, its changed cells are traced one by one while the count
 * runs up, then what it gains and costs appear. Once all are in, the option
 * that changes the fewest cells is suggested.
 */
const FIRST_OPTION = 900;
const FIRST_CELL = 300;
const CELL_GAP = 100;
const VERDICT_AFTER = 120;
const NEXT_AFTER = 760;

export type WhatIfStep =
  | { at: number; kind: "try"; option: number }
  | { at: number; kind: "trace"; option: number; cell: number }
  | { at: number; kind: "weigh"; option: number }
  | { at: number; kind: "suggest" };

/** Every step, in time order, for options that change `cellCounts[k]` cells each. */
export function whatIfSteps(cellCounts: readonly number[]): WhatIfStep[] {
  const steps: WhatIfStep[] = [];
  let t = FIRST_OPTION;
  cellCounts.forEach((cells, option) => {
    steps.push({ at: t, kind: "try", option });
    for (let cell = 0; cell < cells; cell++) {
      steps.push({ at: t + FIRST_CELL + cell * CELL_GAP, kind: "trace", option, cell });
    }
    steps.push({ at: t + FIRST_CELL + cells * CELL_GAP + VERDICT_AFTER, kind: "weigh", option });
    t += FIRST_CELL + cells * CELL_GAP + NEXT_AFTER;
  });
  steps.push({ at: t, kind: "suggest" });
  return steps;
}

/** The option that disturbs least: the fewest changed cells, the earliest on a tie. */
export const gentlest = (cellCounts: readonly number[]) =>
  cellCounts.reduce((best, cells, k) => (cells < (cellCounts[best] ?? Infinity) ? k : best), 0);

export type WhatIfFrame = {
  /** Per option: shown, how many of its cells are traced, and whether its gain and cost show. */
  options: readonly { shown: boolean; traced: number; weighed: boolean }[];
  /** The option being traced now; null before the first and after the suggestion. */
  current: number | null;
  /** The suggested option, once all are in. */
  suggested: number | null;
  pings: number;
};

export function whatIfFrame(steps: readonly WhatIfStep[], count: number, cellCounts: readonly number[]): WhatIfFrame {
  const options = cellCounts.map(() => ({ shown: false, traced: 0, weighed: false }));
  let current: number | null = null;
  let suggested: number | null = null;
  let pings = 0;
  for (const step of steps.slice(0, count)) {
    if (step.kind === "suggest") {
      current = null;
      suggested = gentlest(cellCounts);
      continue;
    }
    const option = options[step.option];
    if (!option) continue;
    if (step.kind === "try") {
      option.shown = true;
      current = step.option;
      pings += 1;
    } else if (step.kind === "trace") {
      option.traced = step.cell + 1;
    } else {
      option.weighed = true;
    }
  }
  return { options, current, suggested, pings };
}

/**
 * The cells marked on today's board: those of the option being traced, as far
 * as it has got, or the suggested option's once it is chosen.
 */
export function markedToday<C>(frame: WhatIfFrame, changes: readonly (readonly C[])[]): readonly C[] {
  if (frame.suggested !== null) return changes[frame.suggested] ?? [];
  if (frame.current === null) return [];
  return changes[frame.current]?.slice(0, frame.options[frame.current]?.traced) ?? [];
}
