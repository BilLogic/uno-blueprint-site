import { describe, expect, it } from "vitest";
import {
  STEP,
  TIMING,
  availableStageHeight,
  beamClip,
  cellBeat,
  fitStage,
  flatLift,
  gateHold,
  gestureBase,
  goalStep,
  introTriggered,
  morphHeading,
  nextStep,
  poseOf,
  poseTransform,
  sceneAt,
  scrollLength,
  scrollProgress,
  stackLayers,
  stepAt,
  stepEdges,
  stepHold,
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
    expect(stickyTopFor(700, 620)).toBe(76);
  });

  it("lets a frame taller than the screen sit higher, so its foot stays 12 px above the bottom", () => {
    expect(stickyTopFor(700, 800)).toBe(-112);
    expect(stickyTopFor(700, 640)).toBe(48);
  });
});

describe("scrollLength", () => {
  it("gives a desktop nine tenths of the steps' scroll, and a phone all of it", () => {
    expect(scrollLength(100, 1440)).toBe(90);
    expect(scrollLength(100, 761)).toBe(90);
    expect(scrollLength(100, 760)).toBe(100);
    expect(scrollLength(767, 1440)).toBe(690.3);
  });
});

describe("availableStageHeight", () => {
  it("is what the viewport leaves after the nav, margins, headline and caption", () => {
    expect(availableStageHeight(900, 200, 118)).toBe(486);
  });
});

describe("fitStage", () => {
  it("gives every pose one scale on a wide frame, as large as fits and never above 1", () => {
    expect(fitStage(1086, 700, 150)).toEqual({ narrow: false, height: 530, scales: [1, 1, 1] });
    const fit = fitStage(808, 700, 150);
    expect(fit.scales).toEqual([0.8, 0.8, 0.8]);
    expect(fit.height).toBeCloseTo(424);
  });

  it("lets a short screen take the headline's height too, and never shrinks below 85% of the width's scale", () => {
    expect(fitStage(808, 300, 100).scales[0]).toBeCloseTo(400 / 530);
    expect(fitStage(1010, 10, 0).scales[0]).toBe(0.85);
    expect(fitStage(808, 10, 0).scales[0]).toBeCloseTo(0.68);
  });

  it("fills a phone frame with each pose at its own scale", () => {
    const fit = fitStage(356, 600, 150);
    expect(fit.narrow).toBe(true);
    expect(fit.height).toBeCloseTo(338.2);
    expect(fit.scales[0]).toBeCloseTo(338.2 / 580);
    expect(fit.scales[1]).toBeCloseTo(356 / 700);
    expect(fit.scales[2]).toBeCloseTo(356 / 800);
  });

  it("keeps a phone frame at least 85% of its full height, and never under 220 px", () => {
    expect(fitStage(356, 100, 150).height).toBeCloseTo(356 * 0.95 * 0.85);
    expect(fitStage(200, 100, 150).height).toBe(220);
  });

  it("treats an unmeasured frame as the full stage", () => {
    expect(fitStage(0, 900, 0).scales).toEqual([1, 1, 1]);
  });
});

describe("poseTransform", () => {
  it("only scales on a wide frame", () => {
    expect(poseTransform(fitStage(1086, 900, 0), 2, 400)).toBe("scale(1)");
  });

  it("centres each pose in the room above the caption on a phone", () => {
    const fit = { narrow: true, height: 400, scales: [0.5, 0.5, 0.5] as const };
    expect(poseTransform(fit, 0, 400)).toBe("translate(0.0px,70.0px) scale(0.5)");
    expect(poseTransform(fit, 1, 400)).toBe("translate(-5.5px,75.0px) scale(0.5)");
    expect(poseTransform(fit, 2, 300)).toBe("translate(5.5px,35.5px) scale(0.5)");
  });
});

describe("poseOf", () => {
  it("shows the stack, then the flat blueprint, then the blueprint with its panel", () => {
    expect([0, 1, 4, 5, 13, 14].map((step) => poseOf(step))).toEqual([0, 0, 0, 1, 1, 2]);
  });

  it("keeps the flat blueprint on the cell step until the cell has opened", () => {
    expect(poseOf(STEP.cell, false)).toBe(1);
    expect(poseOf(STEP.cell, true)).toBe(2);
  });
});

describe("cellBeat", () => {
  it("lights the cell first, and opens it a beat later, only when the cell step is reached from above", () => {
    expect(cellBeat(STEP.cell, STEP.steps)).toBe(true);
    expect(cellBeat(STEP.cell, -1)).toBe(true);
    expect(cellBeat(STEP.cell, STEP.cell)).toBe(false);
    expect(cellBeat(STEP.steps, STEP.cell)).toBe(false);
    expect(cellBeat(STEP.steps, STEP.steps - 1)).toBe(false);
  });

  it("is the step that both picks the cell and opens it", () => {
    expect(STEP.open).toBe(STEP.cell);
    expect(STEP.cell).toBe(STEP.steps + 1);
  });
});

describe("sceneAt", () => {
  it("opens on the context cards, with the stack hidden and no labels beside it", () => {
    const scene = sceneAt(STEP.context, -1);
    expect(scene.intro).toBe(true);
    expect(scene.flat).toBe(false);
    expect(scene.tags.every((t) => !t.in)).toBe(true);
    expect(scene.sheets.map((s) => s.transform)).toEqual(sceneAt(1, 0).sheets.map((s) => s.transform));
    expect(sceneAt(1, 0).intro).toBe(false);
  });

  it("stacks one more sheet with each of the first steps, the followed tile lit on those above", () => {
    const scene = sceneAt(3, 2);
    expect(scene.flat).toBe(false);
    expect(scene.sheets.map((s) => s.out)).toEqual([true, true, false]);
    expect(scene.links).toEqual([true, true, false]);
    expect(scene.tags.map((t) => t.in)).toEqual([true, true, true, false]);
    expect(scene.tags.map((t) => t.current)).toEqual([false, false, true, false]);
  });

  it("keeps the stack centred as it grows, closing up once the paths join it", () => {
    expect(sceneAt(1, 0).sheets[0]!.transform).toBe("translate(0px,160px) rotateX(58deg) rotateZ(-45deg)");
    expect(sceneAt(3, 2).sheets[0]!.transform).toBe("translate(0px,68px) rotateX(58deg) rotateZ(-45deg)");
    expect(sceneAt(4, 3).sheets[0]!.transform).toBe("translate(0px,53px) rotateX(58deg) rotateZ(-45deg)");
    expect(sceneAt(4, 3).board.transform).toBe("translate(0px,151px) rotateX(58deg) rotateZ(-45deg) scale(0.5)");
    expect(sceneAt(4, 3).tags.map((t) => t.top)).toEqual([148, 234, 320, 406]);
  });

  it("sends the sheets away first and the board after them when the blueprint turns", () => {
    const scene = sceneAt(STEP.blueprint, 4);
    expect(scene.flat).toBe(true);
    expect(scene.named).toBe(true);
    expect(scene.sheets.map((s) => s.delay)).toEqual([0, 70, 140]);
    expect(scene.sheets.every((s) => s.gone)).toBe(true);
    expect(scene.sheets.map((s) => s.out)).toEqual([true, true, true]);
    expect(scene.board).toEqual({ transform: "translate(0px,0px) rotateX(0deg) rotateZ(0deg) scale(1.1)", delay: 460 });
  });

  it("lowers the flat board by its lift, and the paths behind it with it", () => {
    const scene = sceneAt(STEP.blueprint, 4, 22);
    expect(scene.board.transform).toBe("translate(0px,22px) rotateX(0deg) rotateZ(0deg) scale(1.1)");
    expect(scene.ghosts[0]).toBe("translate(13px,11px) rotateX(0deg) rotateZ(0deg) scale(1.1)");
    expect(sceneAt(STEP.open, STEP.open, 22).board.transform).toBe(
      "translate(-215px,0px) rotateX(0deg) rotateZ(0deg) scale(0.62)",
    );
  });

  it("tips the board away first and returns the sheets after it on the way back", () => {
    const scene = sceneAt(4, STEP.blueprint);
    expect(scene.sheets.map((s) => s.delay)).toEqual([560, 490, 420]);
    expect(scene.board.delay).toBe(0);
  });

  it("reads one lane, then the line under it, dimming the lanes still to come", () => {
    const lane = sceneAt(8, 7);
    expect(lane.rows.map((r) => r.current)).toEqual([false, true, false, false]);
    expect(lane.rows.map((r) => r.dim)).toEqual([false, false, true, true]);
    expect(lane.rows.map((r) => r.named)).toEqual([true, true, false, false]);
    expect(lane.lines.map((l) => l.on)).toEqual([true, false, false]);

    const line = sceneAt(9, 8);
    expect(line.lines.map((l) => l.current)).toEqual([false, true, false]);
    expect(line.lines.map((l) => l.on)).toEqual([true, true, false]);
  });

  it("shows every line on the whole blueprint and from the steps on", () => {
    expect(sceneAt(STEP.blueprint, 4).lines.every((l) => l.on)).toBe(true);
    expect(sceneAt(STEP.steps, 12).lines.every((l) => l.on)).toBe(true);
    expect(sceneAt(STEP.steps, 12).steps).toBe(true);
  });

  it("shrinks the board beside the open panel and turns its words back to bars", () => {
    const scene = sceneAt(STEP.open, STEP.open);
    expect(scene.open).toBe(true);
    expect(scene.cell).toBe(true);
    expect(scene.named).toBe(false);
    expect(scene.rows.every((r) => !r.named)).toBe(true);
    expect(scene.board.transform).toBe("translate(-215px,0px) rotateX(0deg) rotateZ(0deg) scale(0.62)");
    expect(scene.ghosts[0]).toBe("translate(-202px,-11px) rotateX(0deg) rotateZ(0deg) scale(0.62)");
  });

  it("lights the cell on the flat board while it waits to open", () => {
    const scene = sceneAt(STEP.cell, STEP.steps, 22, false);
    expect(scene.cell).toBe(true);
    expect(scene.open).toBe(false);
    expect(scene.pose).toBe(1);
    expect(scene.named).toBe(true);
    expect(scene.board.transform).toBe("translate(0px,22px) rotateX(0deg) rotateZ(0deg) scale(1.1)");
    expect(sceneAt(STEP.cell, STEP.steps, 22, true).open).toBe(true);
  });
});

describe("stackLayers", () => {
  it("places the six layers of the opening stack: three sheets, the board, then the paths behind it nearest first", () => {
    expect(stackLayers(STEP.context)).toEqual([
      { tx: 0, ty: 160, scale: 1 },
      { tx: 0, ty: 168, scale: 1 },
      { tx: 0, ty: 176, scale: 1 },
      { tx: 0, ty: 24, scale: 0.5 },
      { tx: 0, ty: 34, scale: 0.5 },
      { tx: 0, ty: 44, scale: 0.5 },
    ]);
  });
});

describe("flatLift", () => {
  it("centres the flat board, with the paths peeking out above it, between the frame's top and the caption", () => {
    // Wide: the caption's first line 2 px under a full-size stage is the prototype's 22 px.
    expect(flatLift({ narrow: false, height: 530, scales: [1, 1, 1] }, 532)).toBe(22);
    expect(flatLift({ narrow: false, height: 265, scales: [0.5, 0.5, 0.5] }, 267)).toBe(23);
  });

  it("on a phone, makes up for the pose being centred a little above the caption", () => {
    expect(flatLift({ narrow: true, height: 300, scales: [0.5, 0.5, 0.5] }, 250)).toBe(18);
    expect(flatLift({ narrow: true, height: 300, scales: [1, 1, 1] }, 250)).toBe(12);
  });
});

describe("introTriggered", () => {
  const edges = stepEdges([100, 50, 50]);

  it("plays the opening morph once the reader is 42% into the opening step's scroll, not on arrival", () => {
    expect(introTriggered(0, edges)).toBe(false);
    expect(introTriggered(0.2, edges)).toBe(false);
    expect(introTriggered(0.22, edges)).toBe(true);
    expect(introTriggered(0.7, edges)).toBe(true);
  });
});

describe("morphHeading", () => {
  it("plays the morph forward as soon as the trigger is passed", () => {
    expect(morphHeading(true, STEP.context)).toBe("forward");
    expect(morphHeading(true, 3)).toBe("forward");
  });

  it("plays it back only once the walkthrough has walked back to the opening step", () => {
    expect(morphHeading(false, STEP.context)).toBe("back");
    expect(morphHeading(false, 1)).toBe("hold");
    expect(morphHeading(false, 9)).toBe("hold");
  });
});

describe("goalStep", () => {
  const edges = stepEdges([100, 50, 50]);

  it("is the step under the scroll", () => {
    expect(goalStep(0.1, edges, false)).toBe(0);
    expect(goalStep(0.6, edges, false)).toBe(1);
    expect(goalStep(0.9, edges, true)).toBe(2);
  });

  it("moves on from the opening step past the trigger once the stack has formed", () => {
    expect(goalStep(0.3, edges, false)).toBe(0);
    expect(goalStep(0.3, edges, true)).toBe(1);
    expect(goalStep(0.1, edges, true)).toBe(0);
  });
});

describe("nextStep", () => {
  it("moves one step toward the goal, however far away it is", () => {
    expect(nextStep(1, 9, true)).toBe(2);
    expect(nextStep(9, 1, true)).toBe(8);
    expect(nextStep(4, 4, true)).toBe(4);
  });

  it("holds the opening step until the stack has formed", () => {
    expect(nextStep(0, 5, false)).toBe(0);
    expect(nextStep(0, 5, true)).toBe(1);
    expect(nextStep(1, 0, false)).toBe(0);
  });
});

describe("stepHold", () => {
  it("waits longer before the next step when the stack folds flat or the cell opens", () => {
    expect(stepHold(1, 2)).toBe(TIMING.step);
    expect(stepHold(4, 5)).toBe(TIMING.flatten);
    expect(stepHold(5, 4)).toBe(TIMING.flatten);
    expect(stepHold(STEP.cell, STEP.steps)).toBe(TIMING.openCell);
    expect([TIMING.step, TIMING.flatten, TIMING.openCell, TIMING.morph]).toEqual([560, 1250, 950, 1700]);
  });

  it("adds the cell's beat on the way down, so the cell lights, opens, then holds", () => {
    expect(stepHold(STEP.steps, STEP.cell)).toBe(TIMING.openCell + TIMING.cellBeat);
    expect(TIMING.openCell + TIMING.cellBeat).toBe(1650);
  });
});

describe("the gesture gate", () => {
  // A section whose pinned scroll starts at 1000 px and runs 1000 px, over steps of 40%, 40% and 20%.
  const edges = stepEdges([40, 40, 20]);
  const scroll = { start: 1000, travel: 1000 };

  it("counts a gesture from the step the page was on before it moved", () => {
    expect(gestureBase(1000, scroll, edges)).toBe(0);
    expect(gestureBase(1399, scroll, edges)).toBe(0);
    // A flick that starts on a step's edge counts from the step it starts in.
    expect(gestureBase(1400, scroll, edges)).toBe(1);
    expect(gestureBase(1850, scroll, edges)).toBe(2);
  });

  it("counts a gesture from above the walkthrough from its first step", () => {
    expect(gestureBase(0, scroll, edges)).toBe(0);
  });

  it("frees a gesture that starts where the walkthrough lets go, within 2 px, or past it", () => {
    expect(gestureBase(1997, scroll, edges)).toBe(2);
    expect(gestureBase(1998, scroll, edges)).toBeNull();
    expect(gestureBase(2000, scroll, edges)).toBeNull();
    expect(gestureBase(5000, scroll, edges)).toBeNull();
  });

  it("lets a gesture run anywhere into the next step", () => {
    expect(gateHold(0, 1200, scroll, edges)).toBeNull();
    expect(gateHold(0, 1799, scroll, edges)).toBeNull();
  });

  it("holds a gesture that runs past the next step just inside it, 15% in", () => {
    expect(gateHold(0, 1800, scroll, edges)).toBe(1460);
    expect(gateHold(0, 9000, scroll, edges)).toBe(1460);
    expect(gateHold(1, 1950, scroll, edges)).toBeNull();
    expect(gateHold(1, 2000, scroll, edges)).toBe(1830);
  });

  it("holds the gesture that leaves the last step where the walkthrough lets go", () => {
    expect(gateHold(2, 1999, scroll, edges)).toBeNull();
    expect(gateHold(2, 2000, scroll, edges)).toBe(2000);
    expect(gateHold(2, 2600, scroll, edges)).toBe(2000);
  });

  it("holds on whole pixels", () => {
    expect(gateHold(0, 2000, { start: 1000.4, travel: 1000 }, edges)).toBe(1460);
    expect(gateHold(2, 2600, { start: 1000.6, travel: 1000 }, edges)).toBe(2001);
  });

  it("waits for the page to be still this long before the next gesture counts", () => {
    expect(TIMING.gateIdle).toBe(260);
  });
});

describe("beamClip", () => {
  it("opens the beam from the stage's left edge to a point in stage px", () => {
    expect(beamClip(400)).toBe("inset(-60px 610px -60px 0)");
  });
});
