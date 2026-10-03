import { describe, expect, it } from "vitest";
import { queueArrivals, tokenTravel } from "./bento";

describe("queueArrivals", () => {
  it("lands panels seen together one beat apart, the first at once", () => {
    expect(queueArrivals(3, 1000, 0, 140)).toEqual({ delays: [0, 140, 280], nextFree: 1420 });
  });

  it("makes a panel seen mid-sequence wait for the ones before it", () => {
    const first = queueArrivals(2, 1000, 0, 140);
    expect(queueArrivals(1, 1100, first.nextFree, 140)).toEqual({ delays: [180], nextFree: 1420 });
  });

  it("starts at once when the queue has long been free", () => {
    expect(queueArrivals(1, 5000, 1420, 140)).toEqual({ delays: [0], nextFree: 5140 });
  });

  it("leaves the queue as it was when nothing arrives", () => {
    expect(queueArrivals(0, 5000, 1420, 140)).toEqual({ delays: [], nextFree: 1420 });
  });
});

describe("tokenTravel", () => {
  const cell = { left: 130, top: 32, width: 50, height: 17 };
  const token = { left: -9, top: 89, width: 22, height: 22 };

  it("perches the person over the cell's top-left corner", () => {
    expect(tokenTravel(cell, token, "person")).toEqual({ x: 130 - 12.1 + 9, y: 32 - 12.1 - 89 });
  });

  it("perches the agent over the cell's top-right corner", () => {
    const agent = { ...token, left: 287 };
    expect(tokenTravel(cell, agent, "agent")).toEqual({ x: 180 - 9.9 - 287, y: 32 - 12.1 - 89 });
  });
});
