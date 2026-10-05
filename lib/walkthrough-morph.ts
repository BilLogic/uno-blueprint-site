/**
 * The walkthrough's opening morph: six cards, one per place a team's context
 * lives, tilt and grow into the six layers of the stack (three sheets, the
 * board and the two paths behind it), landing out of order, then shuffle into
 * place. It is timed rather than scrubbed by the scroll: `advanceMorph` moves
 * its progress on with the clock, and `morphFrame` says where every card is
 * at that progress. Geometry is in stage px (see `walkthrough.ts`).
 */
import { STACK_ANGLE, TIMING } from "./walkthrough";

/** Where a card rests (left and top in stage px), its turn in degrees, and its measured size. */
export type CardRest = { x: number; y: number; r: number; w: number; h: number };

/** A layer of the stack as laid out (left, top, size) and as moved (translate and scale). */
export type LayerBox = { x: number; y: number; w: number; h: number; tx: number; ty: number; scale: number };

/** Where a card is drawn at one moment of the morph. */
export type CardFrame = {
  left: number;
  top: number;
  width: number;
  height: number;
  /** The move toward its layer's place, in stage px. */
  tx: number;
  ty: number;
  /** The tilt back, and the turn, toward the stack's angle, in degrees. */
  tilt: number;
  turn: number;
  /** The swing out to one side while the cards shuffle, in stage px. */
  swingX: number;
  swingY: number;
  scale: number;
  radius: number;
  /** The card's own content fades as it tilts, so what lands is a bare layer. */
  contentOpacity: number;
  zIndex: number;
};

/** The six cards' resting left, top and turn: on a wide frame they are scattered, on a phone they sit in two columns. */
export const CARD_PLACES = {
  wide: [
    [140, 104, -5],
    [372, 76, 3],
    [604, 90, -3],
    [826, 132, 5],
    [236, 292, 4],
    [594, 302, -4],
  ],
  narrow: [
    [322, 92, -4],
    [514, 100, 3],
    [322, 198, 3],
    [514, 206, -3],
    [322, 304, 4],
    [514, 312, -4],
  ],
} as const satisfies Record<"wide" | "narrow", readonly (readonly [number, number, number])[]>;

/**
 * Where card `i` rests on a wide frame or a phone's: its left, top and turn.
 * There is a place for each of the six cards the content lists (a test ties
 * the two together); a seventh would share the first's place rather than
 * break the page.
 */
export function cardPlace(i: number, narrow: boolean): readonly [number, number, number] {
  const places = narrow ? CARD_PLACES.narrow : CARD_PLACES.wide;
  return places[i % places.length]!;
}

/** The layer each card lands on first; the shuffle then takes card i to layer i. */
export const LANDING_ORDER = [3, 5, 0, 4, 1, 2] as const;

/** Shares of the morph's progress. */
const TILT_END = 0.42;
const SHUFFLE_START = 0.46;
const SHUFFLE_LENGTH = 0.4;
const CONTENT_FADE_END = 0.22;
/** How far a card swings out mid-shuffle: on a phone, and on a wide frame (each card a little further). */
const SWING = { narrow: 46, wide: 64, widePerCard: 6, rise: 0.25 } as const;
/** The cards settle from a slight wobble on either side as the shuffle ends. */
const JITTER = { odd: 7, even: -6 } as const;
const RADIUS = { card: 12, layer: 16 } as const;
/**
 * The cards' layer sits this high on the stage, above the stack; the cards
 * order themselves just under it while they land. The scene sets the layer's
 * z-index from this, so the two cannot drift apart.
 */
export const CARDS_LAYER = 20;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const easeInOutCubic = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

/** The morph's progress after `elapsedMs` more, played `forward` or back. */
export function advanceMorph(progress: number, forward: boolean, elapsedMs: number): number {
  const dt = Math.min(TIMING.morphFrameCap, elapsedMs);
  return clamp01(progress + ((forward ? 1 : -1) * dt) / TIMING.morph);
}

/**
 * Every card's frame at `progress` (0 to 1). At 0 the cards are at rest and
 * nothing is returned: their own styles place them.
 */
export function morphFrame(
  progress: number,
  cards: readonly CardRest[],
  layers: readonly LayerBox[],
  narrow: boolean,
): CardFrame[] {
  if (progress <= 0) return [];
  const m = easeInOutCubic(clamp01(progress / TILT_END));
  const q = clamp01((progress - SHUFFLE_START) / SHUFFLE_LENGTH);
  const qe = easeInOutCubic(q);
  const contentOpacity = 1 - clamp01(progress / CONTENT_FADE_END);

  return cards.map((card, i) => {
    // The stack has six layers, one per card; any card past those lands on them again.
    const landing = LANDING_ORDER[i % LANDING_ORDER.length]!;
    const a = layers[landing % layers.length]!;
    const b = layers[i % layers.length]!;
    // The layer the card is heading for, part way through the shuffle.
    const to = {
      x: lerp(a.x, b.x, qe),
      y: lerp(a.y, b.y, qe),
      w: lerp(a.w, b.w, qe),
      h: lerp(a.h, b.h, qe),
      tx: lerp(a.tx, b.tx, qe),
      ty: lerp(a.ty, b.ty, qe),
      scale: lerp(a.scale, b.scale, qe),
    };
    const side = i % 2 ? 1 : -1;
    const reach = narrow ? SWING.narrow : SWING.wide + i * SWING.widePerCard;
    const out = landing === i ? 0 : Math.sin(Math.PI * q) * reach;
    const jitter = (1 - qe) * (i % 2 ? JITTER.odd : JITTER.even);
    return {
      left: lerp(card.x, to.x, m),
      top: lerp(card.y, to.y, m),
      width: lerp(card.w, to.w, m),
      height: lerp(card.h, to.h, m),
      tx: lerp(0, to.tx, m),
      ty: lerp(0, to.ty, m),
      tilt: STACK_ANGLE.tilt * m,
      turn: lerp(card.r, STACK_ANGLE.turn + jitter, m),
      swingX: side * out,
      swingY: -out * SWING.rise,
      scale: lerp(1, to.scale, m),
      radius: lerp(RADIUS.card, RADIUS.layer, m),
      contentOpacity,
      // The order is wrong as they land, and right once the shuffle passes its middle.
      zIndex: q < 0.5 ? CARDS_LAYER - landing : CARDS_LAYER - i,
    };
  });
}

/**
 * A frame's transform, in the order the layers of the stack are drawn. The
 * card is moved to its place by the first translate rather than by left and
 * top, so its motion never lays the page out again.
 */
export const cardTransform = (f: CardFrame) =>
  `translate(${f.left}px,${f.top}px) translate(${f.tx}px,${f.ty}px) rotateX(${f.tilt}deg) rotateZ(${f.turn}deg) translate(${f.swingX}px,${f.swingY}px) scale(${f.scale})`;

/** The inline styles that draw a card at a frame; clearing these same names puts it back at rest. */
export function cardStyles(f: CardFrame) {
  return {
    width: `${f.width}px`,
    height: `${f.height}px`,
    transform: cardTransform(f),
    "border-radius": `${f.radius}px`,
    "z-index": String(f.zIndex),
    "--co": f.contentOpacity.toFixed(3),
  };
}

/** Every style name `cardStyles` writes. */
export type CardStyleName = keyof ReturnType<typeof cardStyles>;
export const CARD_STYLE_NAMES = [
  "width",
  "height",
  "transform",
  "border-radius",
  "z-index",
  "--co",
] as const satisfies readonly CardStyleName[];
