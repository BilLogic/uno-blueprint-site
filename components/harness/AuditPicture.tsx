"use client";

import { useRef, type CSSProperties } from "react";
import { audit, skill } from "@/content/harness";
import { useSteps } from "@/hooks/use-steps";
import { AUDIT_FLIGHT, auditFrame, auditSteps, flightStart } from "@/lib/harness-audit";
import { Card, Flow, Side, Skill, flowColumns } from "./Flow";
import { MiniBoard, restingLook } from "./MiniBoard";
import type { PictureProps } from "./pictures";

const TIMES = auditSteps(audit.findings.length);
const { command } = skill("audit");
const flagAnimation = { warn: "animate-to-warn", gap: "animate-to-gap" } as const;

/**
 * The audit: one pass, left to right. The scan crosses the blueprint and
 * flags cells as it passes them; then each finding leaves the skill for its
 * place on an impact and effort graph, and once they are all plotted the
 * corner to do first lights up.
 */
export function AuditPicture({ running }: PictureProps) {
  const skill = useRef<HTMLSpanElement>(null);
  const dots = useRef<(HTMLElement | null)[]>([]);

  const count = useSteps(TIMES, running, (i) => {
    const dot = dots.current[i - 1];
    if (i < 1 || i > audit.findings.length || !dot || !skill.current || !dot.animate) return;
    const from = flightStart(skill.current.getBoundingClientRect(), dot.getBoundingClientRect());
    dot.animate(
      [
        { transform: `translate(${from.x}px,${from.y}px) scale(.35)`, opacity: 0 },
        { opacity: 1, offset: 0.25 },
        { transform: "none", opacity: 1 },
      ],
      // A finding slows into its place on the house curve, as everything that arrives does.
      { duration: AUDIT_FLIGHT, easing: getComputedStyle(dot).getPropertyValue("--ease-out") || "ease-out" },
    );
  });
  const frame = auditFrame(audit.findings.length, count);

  return (
    <Flow className={flowColumns}>
      <Side label={audit.sources}>
        <Card>
          <div className="absolute top-0 bottom-0 w-[3px] animate-sweep bg-primary shadow-[0_0_18px_6px_var(--color-scan-glow)] motion-reduce:[animation-duration:.01s]" />
          <MiniBoard
            cell={(lane, step) => {
              const flag = audit.flags.find((f) => f.lane === lane && f.step === step);
              if (!flag) return { className: restingLook(lane, step) };
              return {
                className: `${restingLook(lane, step)} ${flagAnimation[flag.kind]} [animation-delay:var(--d)] motion-reduce:[animation-duration:.01s] motion-reduce:[animation-delay:0s]`,
                style: { "--d": `${flag.at}s` } as CSSProperties,
              };
            }}
          />
        </Card>
      </Side>
      <Skill command={command} pings={frame.pings} nameRef={skill} />
      <Side label={audit.result}>
        <div className="relative aspect-[260/200] w-full max-w-[330px] max-lg:justify-self-center">
          <svg viewBox="0 0 260 200" aria-hidden="true" className="absolute inset-0 size-full overflow-visible">
            <path d="M138 16V172M26 94H244" className="stroke-line-2 [stroke-dasharray:3_4]" strokeWidth="1" />
            <path
              d="M26 172V10M21 18l5-8 5 8M26 172H250M242 167l8 5-8 5"
              className="fill-none stroke-line-hot"
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <i
            className={`absolute top-[8%] left-[10.8%] block h-[38.2%] w-[41.6%] origin-[0_100%] rounded-8 bg-brand-soft [transition:opacity_var(--duration-t-3),transform_var(--duration-t-3)_var(--ease-out)] motion-reduce:transition-none ${
              frame.done ? "opacity-100 [transform:none]" : "opacity-0 [transform:scale(.94)]"
            }`}
          >
            <em className="absolute top-[7px] left-2 text-11 leading-none font-medium whitespace-nowrap text-brand not-italic">
              {audit.doFirst}
            </em>
          </i>
          {audit.findings.map((finding, i) => (
            <b
              key={i}
              ref={(node) => {
                dots.current[i] = node;
              }}
              style={{ left: `${finding.x}%`, top: `${finding.y}%` }}
              className={`absolute -mt-1.5 -ml-1.5 block size-3 rounded-full border-[1.5px] [transition:transform_var(--duration-t-2)_var(--ease-spring),border-color_var(--duration-t-2),background-color_var(--duration-t-2),box-shadow_var(--duration-t-2)] motion-reduce:transition-none ${
                i < frame.plotted ? "[transform:none]" : "[transform:scale(0)]"
              } ${
                frame.done && finding.first
                  ? "border-brand bg-brand shadow-[0_0_0_4px_var(--color-brand-soft)]"
                  : "border-muted bg-panel"
              }`}
            />
          ))}
          <span className="absolute top-[9%] left-0 rotate-180 text-11 leading-none font-medium text-faint [writing-mode:vertical-rl]">
            {audit.impact}
          </span>
          <span className="absolute right-[4%] bottom-[1%] text-11 leading-none font-medium text-faint">
            {audit.effort}
          </span>
        </div>
      </Side>
    </Flow>
  );
}
