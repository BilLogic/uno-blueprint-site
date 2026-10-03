"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { useId, type CSSProperties } from "react";
import { proof, type ProofMetric } from "@/content/proof";
import { useBarReveal } from "@/hooks/use-bar-reveal";

// A bar's height is its share of the scale, times how far its pair has grown (--p, set by useBarReveal).
const barClass =
  "relative box-border h-[calc(var(--v)*var(--spacing-chart-bar-max)*var(--p,0))] w-[min(var(--spacing-chart-bar),34%)] rounded-t-8 transition-[height] duration-t-grow ease-out max-md:duration-t-4 max-md:delay-(--d) motion-reduce:transition-none";
const seriesClass = [
  "border-[1.5px] border-b-0 border-s1 bg-transparent",
  "bg-s2",
] as const;
const keyClass = [
  "rounded-4 shadow-[inset_0_0_0_1.5px_var(--color-s1)]",
  "rounded-4 bg-s2",
] as const;
const valueClass = [
  "text-muted",
  "text-ink",
] as const;

function Bar({ metric, series, full }: { metric: ProofMetric; series: 0 | 1; full: boolean }) {
  const value = metric.values[series];
  return (
    <div className={`${barClass} ${seriesClass[series]}`} style={{ "--v": value / metric.scale } as CSSProperties}>
      <span
        className={`absolute bottom-[calc(100%+--spacing(2))] left-1/2 -translate-x-1/2 text-15 leading-normal font-medium whitespace-nowrap tabular-nums transition-opacity duration-t-2 motion-reduce:opacity-100 motion-reduce:transition-none ${valueClass[series]} ${full ? "opacity-100" : "opacity-0"}`}
      >
        {value}
        {metric.unit}
      </span>
    </div>
  );
}

export function ProofChart() {
  const [ref, full] = useBarReveal<HTMLDivElement>(proof.metrics.length);
  const id = useId();

  return (
    // The chart stands on the page, unboxed.
    <div className="flex p-px">
      <div ref={ref} className="relative min-w-0 flex-1 overflow-hidden pt-2">
        <div className="flex flex-wrap gap-5.5 text-14 text-muted">
          {proof.series.map((label, series) => (
            <span key={label} className="inline-flex items-center gap-2">
              <i className={`block size-chart-key ${keyClass[series]}`} />
              {label}
            </span>
          ))}
        </div>
        <div className="mt-5 grid grid-cols-4 max-chart:grid-cols-2 max-chart:gap-y-7">
          {proof.metrics.map((metric, index) => {
            const definitionId = `${id}-definition-${index}`;
            const Arrow = metric.direction === "up" ? ArrowUp : ArrowDown;
            // Token use is a different kind of measure, so a rule sets it apart.
            const apart = index === proof.metrics.length - 1;
            return (
              <div
                key={metric.name}
                data-pair
                className={`grid justify-items-center px-2 motion-reduce:[--p:1] ${apart ? "border-l border-dashed border-line-2 max-chart:border-l-0" : ""}`}
              >
                <div
                  data-baseline
                  className="flex h-chart-bars w-full items-end justify-center gap-2.5 border-b border-line-2"
                >
                  <Bar metric={metric} series={0} full={full[index] ?? false} />
                  <Bar metric={metric} series={1} full={full[index] ?? false} />
                </div>
                <div className="relative grid justify-items-center gap-2 pt-3.5 text-center">
                  <button
                    type="button"
                    aria-describedby={definitionId}
                    className="group/name relative cursor-help border-b border-dotted border-faint px-0.5 py-1.5 text-14 leading-caption font-medium text-ink focus-visible:outline-brand focus-visible:outline-offset-3"
                  >
                    {metric.name}
                    <span
                      role="tooltip"
                      id={definitionId}
                      // Read once, through aria-describedby, rather than as part of the button's name.
                      aria-hidden
                      className="pointer-events-none absolute bottom-[calc(100%+--spacing(2.5))] left-1/2 z-4 w-[min(var(--spacing-chart-tip),72vw)] -translate-x-1/2 translate-y-1 rounded-8 bg-ink px-2.75 py-2.25 text-left text-12-5 leading-tip font-normal text-bg opacity-0 transition-[opacity,translate] duration-t-tip ease-plain group-hover/name:translate-y-0 group-hover/name:opacity-100 group-focus-visible/name:translate-y-0 group-focus-visible/name:opacity-100"
                    >
                      {metric.definition}
                    </span>
                  </button>
                  <span className="inline-flex items-center gap-1.25 rounded-pill border border-line-2 px-2.25 py-1.25 font-mono text-12 leading-none font-medium text-ink tabular-nums">
                    <Arrow aria-hidden className="size-chart-key text-s2" />
                    {metric.delta}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
