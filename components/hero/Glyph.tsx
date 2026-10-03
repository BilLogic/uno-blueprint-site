import type { GlyphName } from "./HeroSprite";

/** One of the hero picture's marks or icons, from the sprite `HeroSprite` draws. */
export function Glyph({ name, className }: { name: GlyphName; className: string }) {
  return (
    <svg aria-hidden className={className}>
      <use href={`#hero-${name}`} />
    </svg>
  );
}
