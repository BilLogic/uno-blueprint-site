"use client";

import { occupied, skill, whatif, type CellChange, type CellChangeAt } from "@/content/harness";
import { useSteps } from "@/hooks/use-steps";
import { markedToday, whatIfFrame, whatIfSteps } from "@/lib/harness-whatif";
import { Card, Flow, Side, Skill, flowColumns } from "./Flow";
import { MiniBoard, restingLook } from "./MiniBoard";
import type { PictureProps } from "./pictures";

const CELL_COUNTS = whatif.options.map((option) => option.changes.length);
const STEPS = whatIfSteps(CELL_COUNTS);
const TIMES = STEPS.map((step) => step.at);
const { command } = skill("whatif");
const { question } = whatif;
const NOT_TRIED = { shown: false, traced: 0, weighed: false };

const changeLook: Record<CellChange, string> = {
  ch: "border-amber bg-amber-bg",
  rm: "border-dashed border-amber bg-transparent",
  mv: "border-brand bg-brand-soft",
  ad: "border-brand bg-brand",
};

/*
 * Fades and rises into place. Class names are written out whole so Tailwind
 * finds them; the transform is spelled out because Tailwind's would compose.
 */
const RISE = { small: "[transform:translateY(4px)]", large: "[transform:translateY(6px)]" } as const;
const REVEAL = {
  now: "[transition:opacity_var(--duration-t-2)_var(--ease-out),transform_var(--duration-t-3)_var(--ease-out)]",
  after: "[transition:opacity_var(--duration-t-2)_var(--ease-out)_.09s,transform_var(--duration-t-3)_var(--ease-out)_.09s]",
} as const;
const reveal = (shown: boolean, rise: keyof typeof RISE, delay: keyof typeof REVEAL = "now") =>
  `${REVEAL[delay]} motion-reduce:transition-none ${shown ? "opacity-100 [transform:none]" : `opacity-0 ${RISE[rise]}`}`;

/** One option's own copy of the board, its changed cells lit as far as they have been traced. */
function OptionBoard({ changes, traced }: { changes: readonly CellChangeAt[]; traced: number }) {
  return (
    <div aria-hidden="true" className="grid min-w-0 flex-[0_0_31%] gap-[3px]">
      {occupied.map((lane, l) => (
        <div key={l} className="grid grid-cols-6 gap-[3px]">
          {lane.map((filled, s) => {
            const hit = changes.slice(0, traced).find((c) => c.lane === l && c.step === s);
            const look = !filled
              ? "border-line bg-transparent"
              : hit
                ? changeLook[hit.change]
                : "border-transparent bg-card-2";
            return (
              <i
                key={s}
                className={`block h-[9px] rounded-4 border [transition:background-color_var(--duration-t-1),border-color_var(--duration-t-1)] motion-reduce:transition-none ${look}`}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

/**
 * The what-if: the skill tries one option after another. Each gets its own
 * copy of the blueprint; the cells that differ are traced one by one, on the
 * copy and on today's board, while the count runs up; then what it gains and
 * what it costs. When all three are in, the one that disturbs least is suggested.
 */
export function WhatIfPicture({ running }: PictureProps) {
  const count = useSteps(TIMES, running);
  const frame = whatIfFrame(STEPS, count, CELL_COUNTS);
  const marked = markedToday(
    frame,
    whatif.options.map((option) => option.changes),
  );

  return (
    <Flow className={flowColumns}>
      <Side label={whatif.sources}>
        <Card>
          <MiniBoard
            cell={(lane, step) => {
              if (lane === question.lane && step === question.step) {
                return {
                  className: `${restingLook(lane, step)} animate-to-gap [animation-delay:.4s] motion-reduce:[animation-duration:.01s] motion-reduce:[animation-delay:0s]`,
                };
              }
              const isMarked = marked.some((c) => c.lane === lane && c.step === step);
              return {
                className: isMarked
                  ? "border-dashed border-amber bg-amber-bg before:opacity-20"
                  : restingLook(lane, step),
              };
            }}
          />
        </Card>
      </Side>
      <Skill command={command} pings={frame.pings} />
      <Side label={whatif.result}>
        <div className="grid gap-2">
          {whatif.options.map((option, k) => {
            const state = frame.options[k] ?? NOT_TRIED;
            const best = frame.suggested === k;
            const look = best
              ? "border-dashed border-brand bg-brand-wash shadow-card"
              : state.shown
                ? `bg-panel shadow-card ${frame.current === k ? "border-line-hot" : "border-line-2"}`
                : "border-dashed border-line-2";
            const resting = frame.suggested !== null && !best;
            return (
              <div
                key={option.title}
                className={`relative grid min-h-[88px] items-center rounded-10 border [transition:border-color_var(--duration-t-2),background-color_var(--duration-t-2),box-shadow_var(--duration-t-2),opacity_var(--duration-t-3)] motion-reduce:transition-none ${look} ${resting ? "opacity-70" : ""}`}
              >
                <em
                  aria-hidden={!best}
                  className={`absolute top-[-.85em] right-2.5 rounded-pill bg-brand-badge px-[.75em] py-[.4em] text-11 leading-none font-medium whitespace-nowrap text-brand-badge-ink not-italic [transition:opacity_var(--duration-t-2),transform_var(--duration-t-2)_var(--ease-spring)] motion-reduce:transition-none ${
                    best ? "opacity-100 [transform:none]" : "opacity-0 [transform:scale(.8)]"
                  }`}
                >
                  {whatif.suggested}
                </em>
                <div
                  className={`flex items-center gap-3.5 px-3 py-2.5 ${reveal(state.shown, "large")}`}
                >
                  <OptionBoard changes={option.changes} traced={state.traced} />
                  <div className="grid min-w-0 gap-0.5 text-[.94em] leading-[1.3]">
                    <b className="font-medium text-ink">{option.title}</b>
                    <span className="text-muted">
                      {whatif.differs(state.traced)[0]}
                      <b className="font-medium text-ink tabular-nums">{state.traced}</b>
                      {whatif.differs(state.traced)[1]}
                    </span>
                    <span aria-hidden={!state.weighed} className={`flex gap-1.5 text-muted ${reveal(state.weighed, "small")}`}>
                      <span aria-hidden="true" className="w-[.7em] flex-none text-center font-medium text-brand">
                        +
                      </span>
                      <span>
                        <span className="sr-only">{whatif.gainLabel}</span>
                        {option.gain}
                      </span>
                    </span>
                    <span
                      aria-hidden={!state.weighed}
                      className={`flex gap-1.5 text-muted ${reveal(state.weighed, "small", state.weighed ? "after" : "now")}`}
                    >
                      <span aria-hidden="true" className="w-[.7em] flex-none text-center font-medium text-amber">
                        −
                      </span>
                      <span>
                        <span className="sr-only">{whatif.costLabel}</span>
                        {option.cost}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Side>
    </Flow>
  );
}
