"use client";

import type { ReactNode } from "react";
import { ideas } from "@/content/ideas";
import { dataFlag } from "@/components/ui/data-flag";
import { useTimeline } from "@/hooks/use-timeline";
import { VoiceCard } from "./VoiceCard";

const nodeClass =
  "absolute block size-timeline-node -translate-1/2 scale-0 rounded-full border-(length:--spacing-chart-stroke) border-line-hot bg-bg [transition:scale_var(--duration-t-2)_var(--ease-spring),border-color_var(--duration-t-2),background-color_var(--duration-t-2),box-shadow_var(--duration-t-2)] data-on:scale-100 data-on:border-brand data-on:bg-brand data-on:shadow-node motion-reduce:scale-100 motion-reduce:transition-none";
const railClass =
  "fill-none [stroke-width:var(--spacing-timeline-stroke)] transition-[stroke-dashoffset] duration-t-rail ease-linear motion-reduce:transition-none";

const at = (x: number, y: number) => ({ left: x, top: y });

/**
 * The nine voices down a winding line that ends in `end`. Nothing is drawn up
 * front: a grey track grows ahead of the reader, the green line follows, and
 * each node pops with its arm and card the moment the green reaches it.
 */
export function Timeline({ end }: { end: ReactNode }) {
  const { ref, track, line, layout, progress } = useTimeline<HTMLDivElement>();
  const { voices } = ideas;

  return (
    <div
      ref={ref}
      className="relative mx-auto grid max-w-timeline grid-cols-[minmax(0,1fr)_var(--spacing-timeline-rail)_minmax(0,1fr)] max-md:block"
    >
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 size-full overflow-visible max-md:hidden"
        viewBox={layout ? `0 0 ${layout.width} ${layout.height}` : undefined}
      >
        <path ref={track} d={layout?.path} className={`${railClass} stroke-line-2`} />
        <path ref={line} d={layout?.path} className={`${railClass} stroke-brand`} />
        <g>
          {layout?.points.map(({ x, y, armTo }, i) => (
            <line
              key={i}
              x1={x}
              y1={y}
              x2={armTo}
              y2={y}
              data-on={dataFlag(i < progress.nodes)}
              className="stroke-line-2 opacity-0 transition-[opacity,stroke] duration-t-2 ease-plain data-on:stroke-brand data-on:opacity-100 motion-reduce:opacity-100 motion-reduce:transition-none"
            />
          ))}
        </g>
      </svg>
      {voices.map((voice, i) => (
        <VoiceCard
          key={voice.name}
          voice={voice}
          side={i % 2 ? "right" : "left"}
          row={i + 1}
          on={i < progress.nodes}
        />
      ))}
      {layout?.points.map(({ x, y }, i) => (
        <i key={i} aria-hidden data-on={dataFlag(i < progress.nodes)} style={at(x, y)} className={nodeClass} />
      ))}
      {layout && (
        <i aria-hidden data-on={dataFlag(progress.endNode)} style={at(layout.middle, layout.endY)} className={nodeClass} />
      )}
      <div
        data-end
        data-on={dataFlag(progress.end)}
        style={{ gridRow: voices.length + 2 }}
        // Waits for the line on a wide screen; a phone has no line and shows it at once.
        className="col-span-full mt-19 origin-top [transition:opacity_var(--duration-t-3)_var(--ease-out),translate_var(--duration-t-4)_var(--ease-spring),scale_var(--duration-t-4)_var(--ease-spring)] data-on:translate-y-0 data-on:scale-100 data-on:opacity-100 motion-reduce:transition-none max-md:mt-0 md:motion-safe:scripted:translate-y-4.5 md:motion-safe:scripted:scale-96.5 md:motion-safe:scripted:opacity-0"
      >
        {end}
      </div>
    </div>
  );
}
