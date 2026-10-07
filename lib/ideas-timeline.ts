/*
 * The geometry of the ideas timeline: one winding line down the middle, a node
 * level with each card's head, and an arm from the node to the card. Nothing is
 * drawn up front; a grey track grows ahead of the reader and the green line
 * follows, and a node, its arm and its card arrive together when the green
 * reaches them.
 */

/** A card's box, relative to the timeline. */
export type CardBox = { top: number; left: number; right: number };
/** A node on the line, and the x its arm runs to. */
export type NodePoint = { x: number; y: number; armTo: number };
/** How much of the line is drawn by the time it reaches height `y`. */
export type LengthSample = { y: number; length: number };

/** How far the line swings either side of the middle. */
const SWING = 36;
/** A node sits this far below its card's top, level with the card's head. */
const NODE_DROP = 34;
/** The line enters this far above the timeline. */
const ENTRY = 30;
/** How far above the first node the entry curve's handles sit. */
const ENTRY_HANDLE = 40;
/** The grey track runs to this share of the screen, the green line to the second. */
const TRACK_AT = 0.96;
const REACHED_AT = 0.7;

/** The node for each card: cards alternate left and right of the line, left first. */
export function nodePoints(cards: readonly CardBox[], width: number): NodePoint[] {
  const middle = width / 2;
  return cards.map((card, i) => {
    const right = i % 2 === 1;
    return {
      x: middle + (right ? SWING : -SWING),
      y: card.top + NODE_DROP,
      armTo: right ? card.left : card.right,
    };
  });
}

/** The line's path: in from above the middle, through every node, back to the middle at `endY`. */
export function railPath(points: readonly NodePoint[], middle: number, endY: number): string {
  const first = points[0];
  const last = points.at(-1);
  if (!first || !last) return "";
  const handle = first.y - ENTRY_HANDLE;
  let d = `M${middle} ${-ENTRY}C${middle} ${handle} ${first.x} ${handle} ${first.x} ${first.y}`;
  const curve = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const mid = (from.y + to.y) / 2;
    return `C${from.x} ${mid} ${to.x} ${mid} ${to.x} ${to.y}`;
  };
  for (let i = 1; i < points.length; i++) d += curve(points[i - 1]!, points[i]!);
  return d + curve(last, { x: middle, y: endY });
}

/** The drawn length that brings the line down to height `y`; the line only ever runs downwards. */
export function lengthAtHeight(samples: readonly LengthSample[], y: number): number {
  let length = 0;
  for (const sample of samples) {
    if (sample.y > y) break;
    length = sample.length;
  }
  return length;
}

/**
 * How far down the timeline the grey track and the green line reach, given the
 * timeline's top on a screen `screenHeight` tall. Less motion draws it all.
 */
export function drawHeights(
  screenHeight: number,
  timelineTop: number,
  reduced: boolean,
): { track: number; reached: number } {
  if (reduced) return { track: Infinity, reached: Infinity };
  return {
    track: screenHeight * TRACK_AT - timelineTop,
    reached: screenHeight * REACHED_AT - timelineTop,
  };
}

/** How many nodes, top first, the green line has reached. */
export const reachedCount = (nodeHeights: readonly number[], reached: number) =>
  nodeHeights.filter((y) => y <= reached).length;

/** A quoted person's initials, shown where there is no portrait. */
export const initials = (name: string) =>
  name
    .split(/[ ,&]+/)
    .filter((word) => /^[A-ZÀ-Ý]/.test(word))
    .slice(0, 2)
    .map((word) => word[0])
    .join("");

/**
 * A voice's source opens in a new tab, but only once it has somewhere to go: a
 * link that is not ready yet has no href, so it gets no target and no "opens in
 * a new tab" either.
 */
export function newTabProps(link: { notReady?: true }) {
  return link.notReady ? null : ({ target: "_blank", rel: "noopener noreferrer" } as const);
}
