/** The small blueprint both the duo and the RAG pictures draw: four lanes of five steps, false where a cell is empty. */
export const BOARD = [
  [true, true, false, true, true],
  [true, true, true, false, true],
  [false, true, true, true, true],
  [true, true, false, true, true],
] as const;

/** The duo picture's cell that the person and the agent both reach. */
export const SHARED_CELL = { row: 1, column: 2 } as const;

/** RAG: the cell the retriever pulls from each lane. */
export const HITS = [1, 2, 4, 3] as const;
/** RAG: the centre line of each ranked result, and how strongly it scores. */
export const RESULTS = [
  { y: 38, score: 1 },
  { y: 78, score: 0.76 },
  { y: 118, score: 0.52 },
  { y: 158, score: 0.3 },
] as const;

/** The scale card: three stacks of flows, each starting to fill after its own delay (seconds). */
export const STACKS = [
  { flows: 5, delay: 0.14 },
  { flows: 7, delay: 0, middle: true },
  { flows: 4, delay: 0.24 },
] as const;

/** Sources stay attached: the wires from the cell to each document, top to bottom. */
export const SOURCE_WIRES = [
  "M0 53C20 53 20 15 40 15",
  "M0 53H40",
  "M0 53C20 53 20 91 40 91",
] as const;
