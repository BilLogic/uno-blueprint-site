"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { useId, type CSSProperties, type KeyboardEvent } from "react";
import { proof, type ProofMetric } from "@/content/proof";
import { dataFlag } from "@/components/ui/data-flag";
import { useBarReveal } from "@/hooks/use-bar-reveal";

/*
 * A bar's height is its share of the scale times how far its pair has grown:
 * --p, which useBarReveal sets. Without script, or with less motion, a pair
 * stands full and shows its values.
 */
const barClass =
  "relative box-border h-[calc(var(--v)*var(--spacing-chart-bar-max)*var(--p,1))] w-chart-bar rounded-t-8 transition-[height] duration-t-grow ease-out max-md:duration-t-4 max-md:delay-(--d) motion-reduce:transition-none";
const valueClass =
  "absolute bottom-[calc(100%+--spacing(2))] left-1/2 -translate-x-1/2 text-15 leading-normal font-medium whitespace-nowrap tabular-nums transition-opacity duration-t-2 ease-plain group-data-full/pair:opacity-100 motion-safe:scripted:opacity-0 motion-reduce:transition-none";

/** Without the blueprint, an outline open at the foot; with it, solid. */
const series = [
  {
    bar: "border-(length:--spacing-chart-stroke) border-b-0 border-s1 bg-transparent",
    key: "shadow-[inset_0_0_0_var(--spacing-chart-stroke)_var(--color-s1)]",
    value: "text-muted",
  },
  { bar: "bg-s2", key: "bg-s2", value: "text-ink" },
] as const;

function Bar({ metric, index }: { metric: ProofMetric; index: 0 | 1 }) {
  const value = metric.values[index];
  return (
    <div
      className={`${barClass} ${series[index].bar}`}
      style={{ "--v": value / metric.scale } as CSSProperties}
    >
      <span className={`${valueClass} ${series[index].value}`}>
        {value}
        {metric.unit}
      </span>
    </div>
  );
}

// Escape hides a definition opened from the keyboard.
function closeOnEscape(event: KeyboardEvent<HTMLButtonElement>) {
  if (event.key === "Escape") event.currentTarget.blur();
}

export function ProofChart() {
  const [ref, full] = useBarReveal<HTMLDivElement>(proof.metrics.length);
  const id = useId();

  return (
    // The prototype's panel frame without its face: the chart stands on the page, a pixel in.
    <div className="flex p-px">
      <div ref={ref} className="relative min-w-0 flex-1 overflow-hidden pt-2">
        <div className="flex flex-wrap gap-5.5 text-14 text-muted">
          {proof.series.map((label, index) => (
            <span key={label} className="inline-flex items-center gap-2">
              <i className={`block size-chart-key rounded-4 ${series[index as 0 | 1].key}`} />
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
                data-full={dataFlag(full[index] ?? false)}
                className={`group/pair grid justify-items-center px-2 motion-safe:scripted:[--p:0] ${apart ? "border-l border-dashed border-line-2 max-chart:border-l-0" : ""}`}
              >
                <div
                  data-baseline
                  className="flex h-chart-bars w-full items-end justify-center gap-2.5 border-b border-line-2"
                >
                  <Bar metric={metric} index={0} />
                  <Bar metric={metric} index={1} />
                </div>
                <div className="relative grid justify-items-center gap-2 pt-3.5 text-center">
                  <span className="group/name relative grid">
                    <button
                      type="button"
                      aria-describedby={definitionId}
                      onKeyDown={closeOnEscape}
                      className="cursor-help border-b border-dotted border-faint px-0.5 py-1.5 text-14 leading-caption font-medium text-ink focus-visible:outline-brand focus-visible:outline-offset-3"
                    >
                      {metric.name}
                    </button>
                    <span
                      role="tooltip"
                      id={definitionId}
                      className="pointer-events-none absolute bottom-[calc(100%+--spacing(2.5))] left-1/2 z-4 w-chart-tip -translate-x-1/2 translate-y-1 rounded-8 bg-ink px-2.75 py-2.25 text-left text-12-5 leading-tip font-normal text-bg opacity-0 transition-[opacity,translate] duration-t-tip ease-plain group-hover/name:translate-y-0 group-hover/name:opacity-100 group-has-focus-visible/name:translate-y-0 group-has-focus-visible/name:opacity-100"
                    >
                      {metric.definition}
                    </span>
                  </span>
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
