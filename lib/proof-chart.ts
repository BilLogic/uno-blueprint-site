/*
 * When the proof chart's bars grow. At every width the chart is revealed
 * whole, once, when it is well into view: its pairs start one after another,
 * and each shows its values once its bars are most of the way up.
 */

/** The chart is revealed once its top is above this share of the screen... */
const REVEAL_TOP_AT = 0.45;
/** ...or once its foot is this far, in px, above the foot of the screen. */
const REVEAL_FOOT_CLEARANCE_PX = 24;
/** Each pair starts this much after the one before it (its bars wait only on a phone). */
const PAIR_STAGGER_MS = 130;
/** A pair's values appear this long after it starts. */
const VALUES_AFTER_MS = 520;

/** Whether to reveal the chart, from where its `top` and `bottom` sit on a screen `screenHeight` tall. */
export const revealDue = (chart: { top: number; bottom: number }, screenHeight: number) =>
  chart.bottom < screenHeight - REVEAL_FOOT_CLEARANCE_PX || chart.top < screenHeight * REVEAL_TOP_AT;

/** When pair `index` grows, and when its values appear, after the chart is revealed. */
export function pairReveal(index: number): { growDelayMs: number; valuesAtMs: number } {
  const growDelayMs = index * PAIR_STAGGER_MS;
  return { growDelayMs, valuesAtMs: growDelayMs + VALUES_AFTER_MS };
}
