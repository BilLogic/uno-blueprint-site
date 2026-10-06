import type { CSSProperties } from "react";
import { vars } from "@/components/ui/vars";
import { lanes, occupied, type LaneId } from "@/content/harness";

const COLUMNS = "grid-cols-[6.6em_repeat(6,minmax(0,1fr))]";

/** A lane's swatch colour, handed to the swatch and to anything else drawn in the lane. */
export const laneColour = (lane: LaneId) => vars({ "--la": `var(--color-lane-${lane})` });

/** How a cell looks at rest: a filled cell with a bar of text, or an empty slot. */
const cellLook = {
  filled: "border-transparent bg-card-2 before:opacity-20",
  empty: "border-line bg-transparent before:hidden",
} as const;

export const restingLook = (lane: number, step: number) =>
  occupied[lane]?.[step] ? cellLook.filled : cellLook.empty;

type MiniBoardProps = {
  /** The cell's colours and any state; `restingLook` when it has none. */
  cell?: (lane: number, step: number) => { className: string; style?: CSSProperties };
};

/** A very small blueprint: four lanes of six steps, the words drawn as bars. */
export function MiniBoard({ cell = (l, s) => ({ className: restingLook(l, s) }) }: MiniBoardProps) {
  return (
    <div className="grid">
      <div className={`grid ${COLUMNS} gap-1 px-1 pb-1.5`}>
        <span />
        {(occupied[0] ?? []).map((_, step) => (
          <i key={step} className="block h-[3px] w-[46%] rounded-2 bg-line" />
        ))}
      </div>
      {lanes.map((lane, l) => (
        <div
          key={lane.id}
          style={laneColour(lane.id)}
          className={`grid ${COLUMNS} items-center gap-1 px-1 py-[5px] ${l ? "border-t border-line" : ""}`}
        >
          <em className="flex items-center gap-[.5em] text-lane leading-none font-medium text-muted not-italic before:size-[.6em] before:flex-none before:rounded-[.2em] before:bg-(--la) before:content-['']">
            {lane.name}
          </em>
          {(occupied[l] ?? []).map((_, s) => {
            const { className, style } = cell(l, s);
            return (
              <span
                key={s}
                style={style}
                className={`grid h-6 content-center gap-[3px] rounded-6 border px-1.5 transition-[opacity,border-color,background-color,box-shadow] duration-350 before:h-[3px] before:w-[58%] before:rounded-2 before:bg-ink before:content-[''] motion-reduce:transition-none ${className}`}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
