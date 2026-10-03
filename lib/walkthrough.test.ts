import { describe, expect, it } from "vitest";
import {
  STEP,
  availableStageHeight,
  fitStage,
  poseOf,
  poseTransform,
  sceneAt,
  scrollProgress,
  stepAt,
  stepEdges,
  stickyTopFor,
} from "./walkthrough";

describe("stepEdges", () => {
  it("ends each step at its share of the whole scroll", () => {
    expect(stepEdges([1, 1, 2])).toEqual([0.25, 0.5, 1]);
  });
});

describe("stepAt", () => {
  const edges = stepEdges([40, 40, 20]);

  it("picks the step whose share holds the progress", () => {
    expect(stepAt(0, edges)).toBe(0);
    expect(stepAt(0.39, edges)).toBe(0);
    expect(stepAt(0.4, edges)).toBe(1);
    expect(stepAt(0.85, edges)).toBe(2);
  });

  it("holds the first and last steps beyond either end", () => {
    expect(stepAt(-0.5, edges)).toBe(0);
    expect(stepAt(1, edges)).toBe(2);
    expect(stepAt(3, edges)).toBe(2);
  });
});

describe("scrollProgress", () => {
  it("is 0 until the section reaches the pinned frame's top, then runs to 1", () => {
    const at = (sectionTop: number) =>
      scrollProgress({ stickyTop: 100, sectionTop, sectionHeight: 1100, stickyHeight: 100 });
    expect(at(300)).toBe(0);
    expect(at(100)).toBe(0);
    expect(at(-400)).toBe(0.5);
    expect(at(-900)).toBe(1);
    expect(at(-2000)).toBe(1);
  });

  it("is 0 when the section has no scroll of its own", () => {
    expect(scrollProgress({ stickyTop: 72, sectionTop: -50, sectionHeight: 600, stickyHeight: 600 })).toBe(0);
  });
});

describe("stickyTopFor", () => {
  it("centres the frame under the nav, and never higher than 76 px", () => {
    expect(stickyTopFor(900, 700)).toBe(132);
    expect(stickyTopFor(700, 800)).toBe(76);
  });
});

describe("availableStageHeight", () => {
  it("is what the viewport leaves after the nav, margins, headline and caption", () => {
    expect(availableStageHeight(900, 200, 118)).toBe(486);
  });
});

describe("fitStage", () => {
  it("gives every pose one scale on a wide frame, as large as fits and never above 1", () => {
    expect(fitStage(1086, 700)).toEqual({ narrow: false, height: 530, scales: [1, 1, 1] });
    const fit = fitStage(808, 700);
    expect(fit.scales).toEqual([0.8, 0.8, 0.8]);
    expect(fit.height).toBeCloseTo(424);
    expect(fitStage(1086, 265).scales[0]).toBe(0.5);
    expect(fitStage(1086, 10).scales[0]).toBe(0.25);
  });

  it("fills a phone frame with each pose at its own scale", () => {
    const fit = fitStage(356, 600);
    expect(fit.narrow).toBe(true);
    expect(fit.height).toBeCloseTo(338.2);
    expect(fit.scales[0]).toBeCloseTo(338.2 / 580);
    expect(fit.scales[1]).toBeCloseTo(356 / 700);
    expect(fit.scales[2]).toBeCloseTo(356 / 800);
  });

  it("keeps a phone frame at least 220 px tall", () => {
    expect(fitStage(356, 100).height).toBe(220);
  });

  it("treats an unmeasured frame as the full stage", () => {
    expect(fitStage(0, 900).scales).toEqual([1, 1, 1]);
  });
});

describe("poseTransform", () => {
  it("only scales on a wide frame", () => {
    expect(poseTransform(fitStage(1086, 900), 2, 400)).toBe("scale(1)");
  });

  it("centres each pose in the room above the caption on a phone", () => {
    const fit = { narrow: true, height: 400, scales: [0.5, 0.5, 0.5] as const };
    expect(poseTransform(fit, 0, 400)).toBe("translate(0.0px,54.0px) scale(0.5)");
    expect(poseTransform(fit, 1, 400)).toBe("translate(-5.5px,40.5px) scale(0.5)");
    expect(poseTransform(fit, 2, 300)).toBe("translate(5.5px,21.0px) scale(0.5)");
  });
});

describe("poseOf", () => {
  it("shows the stack, then the flat blueprint, then the blueprint with its panel", () => {
    expect([0, 3, 4, 13, 14].map(poseOf)).toEqual([0, 0, 1, 1, 2]);
  });
});

describe("sceneAt", () => {
  it("stacks one more sheet with each of the first steps, the followed tile lit on those above", () => {
    const scene = sceneAt(2, 1);
    expect(scene.flat).toBe(false);
    expect(scene.sheets.map((s) => s.out)).toEqual([true, true, false]);
    expect(scene.links).toEqual([true, true, false]);
    expect(scene.tags.map((t) => t.in)).toEqual([true, true, true, false]);
    expect(scene.tags.map((t) => t.current)).toEqual([false, false, true, false]);
  });

  it("keeps the stack centred as it grows", () => {
    expect(sceneAt(0, -1).sheets[0]!.transform).toBe("translate(0px,160px) rotateX(58deg) rotateZ(-45deg)");
    expect(sceneAt(3, 2).sheets[0]!.transform).toBe("translate(0px,10px) rotateX(58deg) rotateZ(-45deg)");
    expect(sceneAt(3, 2).board.transform).toBe("translate(0px,150px) rotateX(58deg) rotateZ(-45deg) scale(.5)");
  });

  it("sends the sheets away first and the board after them when the blueprint turns", () => {
    const scene = sceneAt(STEP.blueprint, 3);
    expect(scene.flat).toBe(true);
    expect(scene.named).toBe(true);
    expect(scene.sheets.map((s) => s.delay)).toEqual([0, 70, 140]);
    expect(scene.sheets.every((s) => s.gone)).toBe(true);
    expect(scene.sheets.map((s) => s.out)).toEqual([true, true, true]);
    expect(scene.board).toEqual({ transform: "translate(0px,0px) rotateX(0deg) rotateZ(0deg) scale(1.1)", delay: 460 });
  });

  it("tips the board away first and returns the sheets after it on the way back", () => {
    const scene = sceneAt(3, STEP.blueprint);
    expect(scene.sheets.map((s) => s.delay)).toEqual([560, 490, 420]);
    expect(scene.board.delay).toBe(0);
  });

  it("reads one lane, then the line under it, dimming the lanes still to come", () => {
    const lane = sceneAt(7, 6);
    expect(lane.rows.map((r) => r.current)).toEqual([false, true, false, false]);
    expect(lane.rows.map((r) => r.dim)).toEqual([false, false, true, true]);
    expect(lane.rows.map((r) => r.named)).toEqual([true, true, false, false]);
    expect(lane.lines.map((l) => l.on)).toEqual([true, false, false]);

    const line = sceneAt(8, 7);
    expect(line.lines.map((l) => l.current)).toEqual([false, true, false]);
    expect(line.lines.map((l) => l.on)).toEqual([true, true, false]);
  });

  it("shows every line on the whole blueprint and from the steps on", () => {
    expect(sceneAt(STEP.blueprint, 3).lines.every((l) => l.on)).toBe(true);
    expect(sceneAt(STEP.steps, 11).lines.every((l) => l.on)).toBe(true);
    expect(sceneAt(STEP.steps, 11).steps).toBe(true);
  });

  it("shrinks the board beside the open panel and turns its words back to bars", () => {
    const scene = sceneAt(STEP.open, STEP.cell);
    expect(scene.open).toBe(true);
    expect(scene.cell).toBe(true);
    expect(scene.named).toBe(false);
    expect(scene.rows.every((r) => !r.named)).toBe(true);
    expect(scene.board.transform).toBe("translate(-215px,0px) rotateX(0deg) rotateZ(0deg) scale(0.62)");
    expect(scene.ghosts[0]).toBe("translate(-202px,-11px) rotateX(0deg) rotateZ(0deg) scale(0.62)");
  });
});
