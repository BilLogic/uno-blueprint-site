/** On a touch screen a picture plays this long, rests, and plays again, in milliseconds. */
export const PLAY_MS = 4400;
export const REST_MS = 1200;

/** A beat between one bento panel arriving and the next, in milliseconds. */
export const ARRIVAL_STEP_MS = 140;

/**
 * When each of `count` panels that came into view together arrives, given the
 * time now and the moment the queue is next free. The queue is shared by the
 * whole grid, so a panel that comes into view while others are still arriving
 * waits its turn: panels land one beat apart, left to right, then row by row.
 */
export function queueArrivals(
  count: number,
  now: number,
  nextFree: number,
  step = ARRIVAL_STEP_MS,
): { delays: number[]; nextFree: number } {
  const delays: number[] = [];
  let free = nextFree;
  for (let i = 0; i < count; i++) {
    const at = Math.max(now, free);
    delays.push(at - now);
    free = at + step;
  }
  return { delays, nextFree: free };
}

type Box = { left: number; top: number; width: number; height: number };

/**
 * How far one of the duo picture's two tokens travels to perch on the corner
 * of the cell they share: the person on its top-left corner, the agent on its
 * top-right. Both boxes are measured in the same frame, before any travel.
 */
export function tokenTravel(
  cell: Box,
  token: Box,
  side: "person" | "agent",
): { x: number; y: number } {
  const x =
    side === "agent"
      ? cell.left + cell.width - token.width * 0.45 - token.left
      : cell.left - token.width * 0.55 - token.left;
  const y = cell.top - token.height * 0.55 - token.top;
  return { x, y };
}

/**
 * A typist's rhythm, as the design records it for its question: the gap before
 * each letter after the first, in milliseconds. Most letters come quickly; the
 * longer gaps are the pauses between the question's words.
 */
const TYPIST_GAPS_MS = [25, 21, 81, 20, 29, 25, 20, 28, 19, 27, 20, 70, 27, 84, 21, 23, 30, 37, 30, 26, 37];

/**
 * When each letter of the RAG card's question is typed, in ms after typing
 * starts. A question longer than the recorded rhythm starts the rhythm again.
 */
export function typingDelays(text: string): number[] {
  let delay = 0;
  return [...text].map((_, i) => {
    if (i > 0) delay += TYPIST_GAPS_MS[(i - 1) % TYPIST_GAPS_MS.length] ?? 0;
    return delay;
  });
}
