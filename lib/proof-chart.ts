/*
 * When the proof chart's bars grow. On a wide screen each pair follows the
 * scroll: empty while its baseline is at the foot of the screen, full once the
 * baseline has climbed a third of the way up, so the whole chart is in view
 * while it grows. On a phone the chart is revealed whole, once.
 */

/** The share of the screen a baseline climbs while its bars grow from empty to full. */
const GROW_SPAN = 0.34;
/** A pair this far grown counts as full and shows its values. */
const FULL_AT = 0.97;
/** On a phone, the chart is revealed once its top is above this share of the screen. */
const PHONE_REVEAL_AT = 0.58;
/** On a phone, each pair starts this much after the one before it. */
const PHONE_STAGGER_MS = 130;
/** On a phone, a pair's values appear this long after its bars start. */
const PHONE_VALUES_AFTER_MS = 520;

/** How far a pair has grown, 0 to 1, from where its baseline sits on a screen `screenHeight` tall. */
export function barProgress(baselineY: number, screenHeight: number): number {
  const climbed = (screenHeight - baselineY) / (screenHeight * GROW_SPAN);
  return Math.max(0, Math.min(1, climbed));
}

export const isBarFull = (progress: number) => progress > FULL_AT;

/** Whether a phone should reveal the chart, from where its top sits on the screen. */
export const phoneRevealDue = (chartTop: number, screenHeight: number) =>
  chartTop < screenHeight * PHONE_REVEAL_AT;

/** When pair `index` grows, and when its values appear, after a phone reveals the chart. */
export function phoneReveal(index: number): { growDelayMs: number; valuesAtMs: number } {
  const growDelayMs = index * PHONE_STAGGER_MS;
  return { growDelayMs, valuesAtMs: growDelayMs + PHONE_VALUES_AFTER_MS };
}
