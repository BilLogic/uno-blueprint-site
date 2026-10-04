/**
 * The what-if picture as a timeline. The skill drafts all three options at
 * once, each on its own copy of the board; their changed cells are traced side
 * by side while each count runs up; all three are weighed together, showing
 * what each gains and costs; then the option that changes the fewest cells is
 * suggested and marked on today's board.
 */
const DRAFT_AT = 900;
const FIRST_CELL_AFTER = 300;
const CELL_GAP = 140;
const WEIGH_AFTER = 200;
const SUGGEST_AFTER = 1100;

export type WhatIfStep =
  | { at: number; kind: "draft" }
  | { at: number; kind: "trace"; option: number; cell: number }
  | { at: number; kind: "weigh" }
  | { at: number; kind: "suggest" };

/** Every step, in time order, for options that change `cellCounts[k]` cells each. */
export function whatIfSteps(cellCounts: readonly number[]): WhatIfStep[] {
  const most = Math.max(0, ...cellCounts);
  const steps: WhatIfStep[] = [{ at: DRAFT_AT, kind: "draft" }];
  for (let cell = 0; cell < most; cell++) {
    cellCounts.forEach((cells, option) => {
      if (cell < cells) steps.push({ at: DRAFT_AT + FIRST_CELL_AFTER + cell * CELL_GAP, kind: "trace", option, cell });
    });
  }
  const weigh = DRAFT_AT + FIRST_CELL_AFTER + most * CELL_GAP + WEIGH_AFTER;
  steps.push({ at: weigh, kind: "weigh" }, { at: weigh + SUGGEST_AFTER, kind: "suggest" });
  return steps;
}

/** The option that disturbs least: the fewest changed cells, the earliest on a tie. */
export const gentlest = (cellCounts: readonly number[]) =>
  cellCounts.reduce((best, cells, k) => (cells < (cellCounts[best] ?? Infinity) ? k : best), 0);

export type WhatIfFrame = {
  /** Per option: shown, how many of its cells are traced, and whether its gain and cost show. */
  options: readonly { shown: boolean; traced: number; weighed: boolean }[];
  /** The options are drafted and still being traced or weighed; none is suggested yet. */
  tracing: boolean;
  /** The suggested option, once all are weighed. */
  suggested: number | null;
  pings: number;
};

export function whatIfFrame(steps: readonly WhatIfStep[], count: number, cellCounts: readonly number[]): WhatIfFrame {
  const options = cellCounts.map(() => ({ shown: false, traced: 0, weighed: false }));
  let tracing = false;
  let suggested: number | null = null;
  let pings = 0;
  for (const step of steps.slice(0, count)) {
    if (step.kind === "draft") {
      options.forEach((option) => (option.shown = true));
      tracing = true;
      pings += 1;
    } else if (step.kind === "trace") {
      const option = options[step.option];
      if (option) option.traced = step.cell + 1;
    } else if (step.kind === "weigh") {
      options.forEach((option) => (option.weighed = true));
    } else {
      tracing = false;
      suggested = gentlest(cellCounts);
    }
  }
  return { options, tracing, suggested, pings };
}

/** The cells marked on today's board: none while the options are traced, then the suggested option's. */
export function markedToday<C>(frame: WhatIfFrame, changes: readonly (readonly C[])[]): readonly C[] {
  return frame.suggested === null ? [] : (changes[frame.suggested] ?? []);
}
