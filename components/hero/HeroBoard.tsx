import { Fragment, memo } from "react";
import { hero } from "@/content/hero";
import type { HeroPictureRefs } from "@/hooks/use-hero-picture";
import { COLS, WALKERS, cellAt, type Board } from "@/lib/hero-picture";
import { LANE_COLORS } from "./lanes";
import { Glyph } from "./Glyph";
import { ToolIcon } from "./ToolIcon";

const { picture } = hero;


const ghost = "absolute inset-0 block rounded-16 border border-line-2 bg-panel";

/** The blueprint the documents land on, with two more of the stack peeking out behind it. */
type HeroBoardProps = { board: Board } & Pick<HeroPictureRefs, "sheetRef" | "cellRef" | "walkerRef">;

export function HeroBoard({ board, sheetRef, cellRef, walkerRef }: HeroBoardProps) {
  const { breadcrumb } = picture;
  return (
    <div className="relative z-1 min-w-0 max-md:w-full">
      <i className={`${ghost} translate-x-4.5 -translate-y-4 opacity-45`} />
      <i className={`${ghost} translate-x-2.25 -translate-y-2 opacity-75`} />
      <div
        ref={sheetRef}
        className="relative z-1 grid gap-2.5 rounded-16 border border-line-2 bg-panel p-3.5 shadow-card max-md:w-full max-md:gap-1.5 max-md:rounded-10 max-md:p-2.5"
      >
        <i className="absolute top-1/2 -left-1 size-1.75 -translate-y-1/2 rounded-full border border-line-hot bg-panel max-md:-top-1 max-md:left-1/2 max-md:-translate-x-1/2 max-md:translate-y-0" />
        <div className="flex items-center gap-1.5 border-b border-line px-0.5 pt-0.5 pb-2.5 text-11 font-medium whitespace-nowrap text-faint">
          {breadcrumb.service}
          <span className="opacity-60">/</span>
          {breadcrumb.phase}
          <span className="opacity-60">/</span>
          <span className="text-ink">{breadcrumb.scenario}</span>
          <span className="ml-auto inline-flex items-center gap-1.25 rounded-6 border border-line-2 py-1 pr-1.5 pl-2 text-muted">
            {breadcrumb.path}
            <Glyph name="chevron" className="size-2.75" />
          </span>
        </div>
        <div
          className={`relative grid gap-1.5 transition-opacity duration-450 max-md:gap-0.75 ${board.fading ? "opacity-0" : ""}`}
        >
          {picture.lanes.map((lane, row) => (
            <Fragment key={lane}>
              <div className="grid grid-cols-(--hero-lane-columns) items-center gap-1.5 max-md:gap-0.75">
                <b title={lane} className={`block size-2 rounded-2 max-md:size-1.5 ${LANE_COLORS[row]}`} />
                {Array.from({ length: COLS }, (_, col) => {
                  const cell = cellAt(row, col);
                  return (
                    <Cell
                      key={col}
                      sources={board.sources[cell] ?? []}
                      focused={board.projecting && board.focus === cell}
                      cellRef={cellRef(cell)}
                    />
                  );
                })}
              </div>
              {row < picture.lanes.length - 1 && <div className="my-px ml-4 h-0 border-t border-line max-md:ml-2.25" />}
            </Fragment>
          ))}
          {WALKERS.map((kind, i) => (
            <span
              key={i}
              ref={walkerRef(i)}
              className={`pointer-events-none absolute top-0 left-0 z-3 grid size-5.5 place-items-center opacity-0 shadow-walker transition-walk data-placed:opacity-100 motion-reduce:transition-none max-md:size-4 ${
                kind === "person" ? "rounded-full bg-ink text-bg" : "rounded-8 bg-brand text-on-primary max-md:rounded-6"
              }`}
            >
              <Glyph name={kind} className="size-3.25 max-md:size-2.5" />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

type CellProps = {
  sources: readonly number[];
  focused: boolean;
  cellRef: (element: HTMLSpanElement | null) => void;
};

const sketch = "block h-1 rounded-2 transition-[width] duration-500 ease-sketch max-md:h-0.5";

/** A cell: two sketched lines once filled, and a badge for each source that fed it. Memoised, so a change to one cell re-renders only that cell. */
const Cell = memo(function Cell({ sources, focused, cellRef }: CellProps) {
  const filled = sources.length > 0;
  const state = focused
    ? "border-brand shadow-focus"
    : filled
      ? "border-line-2"
      : "border-line";
  return (
    <span
      ref={cellRef}
      className={`relative grid h-13 content-start gap-1.25 rounded-8 border p-2.25 transition-[border-color,background-color,opacity,box-shadow] duration-400 max-md:h-7.5 max-md:gap-0.75 max-md:rounded-6 max-md:p-1.5 ${state} ${filled ? "bg-cell" : ""}`}
    >
      <u className={`${sketch} ${filled ? "w-sketch-long bg-sketch" : "w-0 bg-line-2"}`} />
      <u className={`${sketch} bg-line-2 ${filled ? "w-sketch-short" : "w-0"}`} />
      <span className="absolute right-1.5 bottom-1.25 flex max-md:hidden">
        {sources.map((tool, i) => (
          <i
            key={i}
            className="-ml-1 grid size-3.5 place-items-center rounded-full border border-line-2 bg-panel motion-safe:animate-source-pop"
          >
            <ToolIcon
              icon={picture.tools[tool]!.icon}
              markClassName="size-2 fill-muted"
              lineClassName="size-2 text-muted"
            />
          </i>
        ))}
      </span>
    </span>
  );
});
