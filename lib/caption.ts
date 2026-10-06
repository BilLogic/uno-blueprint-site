/**
 * The walkthrough caption's stagger. The title arrives whole; then every line
 * of the caption at once, each word `stagger` ms after the one before it, left
 * to right going forward and right to left going back. A long line's stagger
 * shrinks so its last word starts no more than `span` ms after its first.
 */
export const CAPTION_STAGGER = { stagger: 30, span: 120 } as const;

/** Each caption word's delay in ms, line by line, after the title's 0; `lines` gives each line's word count. */
export function captionDelays(lines: readonly number[], direction: 1 | -1, { stagger, span } = CAPTION_STAGGER): number[][] {
  return lines.map((count) => {
    const step = count > 1 ? Math.min(stagger, span / (count - 1)) : 0;
    return Array.from({ length: count }, (_, i) => Math.round(stagger + (direction > 0 ? i : count - 1 - i) * step));
  });
}
