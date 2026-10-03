/**
 * Holds the hero picture's place until the animated picture lands. The frame is
 * the prototype's (a one-pixel gradient rim around the card colour) and the
 * heights track the prototype's rendered ones, so the page below keeps its
 * position when the picture arrives.
 */
export function HeroPicturePlaceholder() {
  return (
    <div
      aria-hidden
      className="mt-16 flex rounded-20 bg-linear-to-b from-line-2 to-line p-px"
    >
      <div className="h-hero-picture w-full rounded-20-inset bg-card" />
    </div>
  );
}
