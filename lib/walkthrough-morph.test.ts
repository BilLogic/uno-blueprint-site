import { describe, expect, it } from "vitest";
import { structure } from "@/content/structure";
import { TIMING } from "./walkthrough";
import {
  CARD_PLACES,
  cardPlace,
  LANDING_ORDER,
  CARD_STYLE_NAMES,
  advanceMorph,
  cardStyles,
  cardTransform,
  easeInOutCubic,
  morphFrame,
  type CardRest,
  type LayerBox,
} from "./walkthrough-morph";

/** Six cards resting in a row, and six layers each a little lower than the last. */
const cards: CardRest[] = Array.from({ length: 6 }, (_, i) => ({ x: i * 100, y: 50, r: i, w: 168, h: 90 }));
const layers: LayerBox[] = Array.from({ length: 6 }, (_, i) => ({
  x: 355,
  y: i * 10,
  w: 300,
  h: 190,
  tx: 0,
  ty: 160 + i * 8,
  scale: i < 3 ? 1 : 0.5,
}));

describe("easeInOutCubic", () => {
  it("starts and ends still and is halfway at the middle", () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(0.5)).toBe(0.5);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.25)).toBeCloseTo(0.0625);
  });
});

describe("advanceMorph", () => {
  it("plays the whole morph in its duration, forward or back", () => {
    expect(advanceMorph(0, true, 17)).toBeCloseTo(17 / TIMING.morph);
    expect(advanceMorph(0.5, false, 34)).toBeCloseTo(0.5 - 34 / TIMING.morph);
  });

  it("never moves further than one capped frame, and stays between 0 and 1", () => {
    expect(advanceMorph(0.5, true, 5000)).toBeCloseTo(0.5 + TIMING.morphFrameCap / TIMING.morph);
    expect(advanceMorph(0.99, true, 60)).toBe(1);
    expect(advanceMorph(0.01, false, 60)).toBe(0);
  });
});

describe("morphFrame", () => {
  it("leaves the cards at rest before the morph starts", () => {
    expect(morphFrame(0, cards, layers, false)).toEqual([]);
  });

  it("lands each card on a layer out of order first, its content fading as it tilts", () => {
    const frames = morphFrame(0.21, cards, layers, false);
    // Halfway through the tilt, and the shuffle not begun: halfway from rest to the wrong layer.
    frames.forEach((frame, i) => {
      const to = layers[LANDING_ORDER[i]!]!;
      expect(frame.left).toBeCloseTo((cards[i]!.x + to.x) / 2);
      expect(frame.top).toBeCloseTo((cards[i]!.y + to.y) / 2);
      expect(frame.width).toBeCloseTo((168 + to.w) / 2);
      expect(frame.tilt).toBeCloseTo(29);
      expect(frame.zIndex).toBe(20 - LANDING_ORDER[i]!);
      expect(frame.swingX).toBeCloseTo(0);
    });
    expect(frames[0]!.contentOpacity).toBeCloseTo(1 - 0.21 / 0.22);
    expect(morphFrame(0.3, cards, layers, false)[0]!.contentOpacity).toBe(0);
  });

  it("swings the cards out to either side mid-shuffle and puts them in order", () => {
    const frames = morphFrame(0.66, cards, layers, false);
    expect(frames.map((f) => f.swingX)).toEqual([-64, 70, -76, 82, -88, 94].map((x) => expect.closeTo(x, 5)));
    expect(frames[1]!.swingY).toBeCloseTo(-70 * 0.25);
    expect(frames.map((f) => f.zIndex)).toEqual([20, 19, 18, 17, 16, 15]);
    expect(morphFrame(0.66, cards, layers, true)[0]!.swingX).toBeCloseTo(-46);
  });

  it("ends with every card exactly on its own layer, flat to the stack and scaled like it", () => {
    const frames = morphFrame(1, cards, layers, false);
    frames.forEach((frame, i) => {
      const layer = layers[i]!;
      expect(frame).toMatchObject({ left: layer.x, top: layer.y, width: layer.w, height: layer.h });
      expect(frame).toMatchObject({ tx: layer.tx, ty: layer.ty, tilt: 58, turn: -45, scale: layer.scale });
      expect(frame.swingX).toBeCloseTo(0);
      expect(frame.radius).toBe(16);
      expect(frame.contentOpacity).toBe(0);
    });
  });
});

describe("cardTransform", () => {
  it("places the card, moves, tilts and turns it like a layer, then swings and scales it", () => {
    const [frame] = morphFrame(1, cards, layers, false);
    expect(cardTransform({ ...frame!, swingX: 0, swingY: 0 })).toBe(
      "translate(355px,0px) translate(0px,160px) rotateX(58deg) rotateZ(-45deg) translate(0px,0px) scale(1)",
    );
  });
});

describe("cardStyles", () => {
  it("writes every style a card is drawn with, and names each so it can be cleared", () => {
    const [frame] = morphFrame(1, cards, layers, false);
    const styles = cardStyles(frame!);
    expect(styles).toMatchObject({ width: "300px", "border-radius": "16px", "z-index": "20", "--co": "0.000" });
    expect(styles.transform).toMatch(/^translate\(355px,0px\) /);
    expect([...CARD_STYLE_NAMES].sort()).toEqual(Object.keys(styles).sort());
  });
});

describe("CARD_PLACES", () => {
  it("has a place for every card the content lists, on a wide frame and on a phone", () => {
    const count = structure.context.cards.length;
    expect(CARD_PLACES.wide).toHaveLength(count);
    expect(CARD_PLACES.narrow).toHaveLength(count);
    expect(LANDING_ORDER).toHaveLength(count);
    expect(new Set(LANDING_ORDER)).toEqual(new Set(Array.from({ length: count }, (_, i) => i)));
  });

  it("still places, and morphs, a card past the last place", () => {
    const extra = CARD_PLACES.wide.length;
    expect(cardPlace(extra, false)).toEqual(CARD_PLACES.wide[0]);
    expect(cardPlace(extra, true)).toEqual(CARD_PLACES.narrow[0]);
    const seven = [...cards, { ...cards[0]! }];
    const frames = morphFrame(0.5, seven, layers, false);
    expect(frames).toHaveLength(7);
    for (const frame of frames) expect(Number.isFinite(frame.left + frame.top + frame.tx + frame.ty)).toBe(true);
  });
});
