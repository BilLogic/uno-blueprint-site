/** The steps a journey reader shows, from `start` up to but not including `end`. */
export type StepWindow = { start: number; end: number };

/**
 * Which of a journey's steps fit a screen that shows `size` of them: the lit
 * step as near the middle as the list's ends allow. With nothing lit (an
 * index of -1) the list shows from the top.
 */
export function stepWindow(count: number, lit: number, size: number): StepWindow {
  if (count <= size) return { start: 0, end: count };
  const start = Math.min(Math.max(lit - Math.floor(size / 2), 0), count - size);
  return { start, end: start + size };
}

/** The lane with `key`, typed as that lane; a key no lane has is a mistake in the content. */
export function laneByKey<L extends { key: string }, K extends L["key"]>(lanes: readonly L[], key: K): Extract<L, { key: K }> {
  const lane = lanes.find((candidate): candidate is Extract<L, { key: K }> => candidate.key === key);
  if (!lane) throw new Error(`no lane has the key ${key}`);
  return lane;
}
