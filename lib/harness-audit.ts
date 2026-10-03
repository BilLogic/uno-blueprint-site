import type { Box } from "./harness-map";

/**
 * The audit picture as a timeline. The scan crosses the board first (a CSS
 * animation); then the skill pings, each finding leaves it a beat after the
 * one before, and the corner to do first lights once they have all landed.
 */
const FIRST_FINDING = 1950;
const PING_BEFORE = 250;
const FINDING_GAP = 150;
/** How long a finding takes to fly from the skill to its place (ms). */
export const AUDIT_FLIGHT = 640;
const SETTLE = 150;

/** Step 0 is the ping, steps 1..n each plot a finding, the last lights the corner. */
export function auditSteps(findings: number): number[] {
  return [
    FIRST_FINDING - PING_BEFORE,
    ...Array.from({ length: findings }, (_, i) => FIRST_FINDING + i * FINDING_GAP),
    FIRST_FINDING + findings * FINDING_GAP + AUDIT_FLIGHT + SETTLE,
  ];
}

export type AuditFrame = { pings: number; plotted: number; done: boolean };

export function auditFrame(findings: number, count: number): AuditFrame {
  return {
    pings: count > 0 ? 1 : 0,
    plotted: Math.min(Math.max(count - 1, 0), findings),
    done: count > findings + 1,
  };
}

/**
 * Where a finding starts its flight, as an offset from its resting place:
 * from the skill's right edge when the graph sits beside it, from its foot
 * when the graph sits below.
 */
export function flightStart(skill: Box, dot: Box): { x: number; y: number } {
  const beside = skill.right < dot.left;
  const x = beside ? skill.right + 8 : skill.left + skill.width / 2;
  const y = beside ? skill.top + skill.height / 2 : skill.bottom + 8;
  return { x: x - (dot.left + dot.width / 2), y: y - (dot.top + dot.height / 2) };
}
