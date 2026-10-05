/** A path through a journey: its name and its steps along the journey's axis. */
export type PathSteps = { path: string; steps: readonly string[] };

/**
 * One slot on the merged axis: a step every path shares, drawn once, or the
 * slot where the paths part, holding each path's own step in the paths' order.
 */
export type Slot = { step: string } | { apart: readonly { path: string; step: string }[] };

/**
 * Lays paths along one step axis: where every path takes the same step the
 * slot holds it once; where they differ it holds each path's step, tagged with
 * its path. Paths of different lengths share no axis, so that is a mistake in
 * the content.
 */
export function mergePaths(paths: readonly PathSteps[]): Slot[] {
  const [first, ...rest] = paths;
  if (!first) return [];
  for (const other of rest) {
    if (other.steps.length !== first.steps.length) {
      throw new Error(`${other.path} has ${other.steps.length} steps, ${first.path} has ${first.steps.length}`);
    }
  }
  return first.steps.map((step, index) =>
    paths.every((other) => other.steps[index] === step)
      ? { step }
      : {
          apart: paths.map((other) => ({
            path: other.path,
            step: other.steps[index]!,
          })),
        },
  );
}

/**
 * A grid template for `count` slots in which the slots at `wide` take twice
 * the room of the rest, so a slot holding more than one path has space for
 * their names.
 */
export function partedColumns(count: number, wide: Iterable<number>): string {
  const widened = new Set(wide);
  return Array.from({ length: count }, (_, index) => `minmax(0,${widened.has(index) ? 2 : 1}fr)`).join(" ");
}
