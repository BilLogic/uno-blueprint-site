/**
 * The slice picture: one kind of slice after another is picked, and that part
 * of the board lights. It loops by itself; pointing at a kind holds it there.
 */
export type SliceKind = "journey" | "lane" | "step" | "cell" | "custom";

/** When the first kind is picked, how long each holds, and the pause before looping again after a hold (ms). */
export const SLICE_FIRST = 300;
export const SLICE_HOLD = 1500;
export const SLICE_RESUME = 900;

const CUSTOM: readonly (readonly [number, number])[] = [
  [0, 1],
  [1, 3],
  [2, 5],
  [3, 3],
];

/** Whether the cell in `lane`, `step` belongs to a slice of this kind. */
export function inSlice(kind: SliceKind, lane: number, step: number): boolean {
  switch (kind) {
    case "journey":
      return lane === 0;
    case "lane":
      return lane === 2;
    case "step":
      return step === 2;
    case "cell":
      return lane === 2 && step === 4;
    case "custom":
      return CUSTOM.some(([l, s]) => l === lane && s === step);
  }
}

/** The kind after `index`, wrapping round to the first. */
export const nextSlice = (index: number, count: number) => (index + 1) % count;
