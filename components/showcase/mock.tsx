import type { ReactNode } from "react";
import { repairBoard, type CellMark, type LaneKey, type Marks, type Steps } from "@/content/repair-board";

/**
 * The pieces a product mock is drawn with: a window with the board on the
 * left and a side panel on the right, the lanes and cells of a blueprint, and
 * the small tags, notes and terminal that sit in them. Sizes inside are in em,
 * so the picture scales with the window's font.
 */

/**
 * The app window, sitting on the stage's bottom edge. Narrow screens drop the
 * side panel. It is a picture of the product, so assistive technology skips it
 * and reads the caption under the stage instead.
 */
export function MockWindow({ board, panel }: { board: ReactNode; panel: ReactNode }) {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-x-14 top-12 bottom-0 grid grid-cols-[1fr_var(--spacing-mock-panel)] overflow-hidden rounded-t-12 border border-b-0 border-line bg-panel text-mock shadow-mock max-lg:inset-x-3 max-lg:top-10 max-lg:grid-cols-1"
    >
      <div className="grid content-start gap-2 p-5">{board}</div>
      <div className="grid content-start gap-2.5 border-l border-line p-5 max-lg:hidden">{panel}</div>
    </div>
  );
}

const laneDot: Record<LaneKey, string> = {
  user: "before:bg-lane-user",
  front: "before:bg-lane-front",
  back: "before:bg-lane-back",
  support: "before:bg-lane-support",
};

const columns: Record<Steps["length"], string> = { 4: "grid-cols-4", 6: "grid-cols-6" };

const cellMarks: Record<CellMark | "none", string> = {
  none: "bg-panel",
  hi: "border-dashed border-brand bg-brand-soft",
  warn: "border-amber bg-amber-bg",
  gap: "border-dashed border-amber text-amber max-md:before:bg-amber max-md:before:opacity-55 max-md:after:bg-amber max-md:after:opacity-55",
};

/**
 * One cell. On a phone its words would be cut off, so they are drawn as two
 * bars instead.
 */
function Cell({ mark, children }: { mark: CellMark | undefined; children: string }) {
  return (
    <span
      className={`min-h-(--spacing-cell) rounded-6 border border-line-2 p-1.5 text-11 leading-tight max-md:grid max-md:min-h-(--spacing-cell-bars) max-md:content-start max-md:gap-1 max-md:px-1.5 max-md:py-2 max-md:text-0 max-md:before:block max-md:before:h-1 max-md:before:w-(--spacing-bar-long) max-md:before:rounded-2 max-md:before:bg-bar max-md:before:content-[''] max-md:after:block max-md:after:h-1 max-md:after:w-(--spacing-bar-short) max-md:after:rounded-2 max-md:after:bg-line-2 max-md:after:content-[''] ${cellMarks[mark ?? "none"]}`}
    >
      {mark === "gap" ? repairBoard.gapLabel : children}
    </span>
  );
}

type LaneProps = {
  lane: LaneKey;
  name: string;
  steps: Steps;
  marks?: Marks;
};

/** A swimlane: its name with a dot in the lane's colour, then one cell per step. */
export function Lane({ lane, name, steps, marks = {} }: LaneProps) {
  return (
    <div className="grid grid-cols-[var(--spacing-lane-label)_minmax(0,1fr)] items-center gap-(--spacing-lane-gap) py-(--spacing-lane-y) [&+&]:border-t [&+&]:border-dashed [&+&]:border-line-2">
      <span
        className={`flex items-center gap-(--spacing-lane-gap) justify-self-start text-lane font-medium whitespace-nowrap text-muted before:size-(--spacing-lane-dot) before:flex-none before:rounded-(--radius-lane-dot) before:content-[''] ${laneDot[lane]}`}
      >
        {name}
      </span>
      <div className={`grid gap-1.5 ${columns[steps.length]}`}>
        {steps.map((step, index) => (
          <Cell key={index} mark={marks[step]}>
            {step}
          </Cell>
        ))}
      </div>
    </div>
  );
}

/** The repair intake board, every lane and step, with the cells named in `marks` marked. */
export function Board({ marks = {} }: { marks?: Marks }) {
  return (
    <>
      <b>{repairBoard.title}</b>
      {repairBoard.lanes.map((lane) => (
        <Lane key={lane.key} lane={lane.key} name={lane.name} steps={lane.steps} marks={marks} />
      ))}
    </>
  );
}

/** A small pill; amber when it flags something missing. */
export function Tag({ amber = false, children }: { amber?: boolean; children: string }) {
  return (
    <span
      className={`justify-self-start rounded-pill px-(--spacing-tag-x) py-0.5 text-11 leading-normal font-medium ${amber ? "bg-amber-bg text-amber" : "bg-hi text-link"}`}
    >
      {children}
    </span>
  );
}

/** A finding, marked with an amber dot. */
export function Note({ children }: { children: string }) {
  return (
    <div className="flex gap-2">
      <span className="mt-(--spacing-note-dot-y) size-(--spacing-note-dot) flex-none rounded-full bg-amber" />
      <span>{children}</span>
    </div>
  );
}

type OptionListProps = {
  title: string;
  options: readonly string[];
  /** The first option is the open one, drawn as a tag. */
  firstOpen?: boolean;
  titleClassName?: string;
};

/** A titled group of options in the side panel. */
export function OptionList({ title, options, firstOpen = false, titleClassName = "" }: OptionListProps) {
  return (
    <>
      <b className={titleClassName}>{title}</b>
      {options.map((option, index) =>
        firstOpen && index === 0 ? <Tag key={index}>{option}</Tag> : <span key={index}>{option}</span>,
      )}
    </>
  );
}

/** A step opened in the side panel: it has no owner yet, a status, and a source. */
export function StepDetail({ step }: { step: string }) {
  const { detail } = repairBoard;
  return (
    <>
      <b>{step}</b>
      <span>
        {detail.owner} · <Tag amber>{detail.missing}</Tag>
      </span>
      <span>{detail.status}</span>
      <b>{detail.sourcesTitle}</b>
      <Tag>{detail.source}</Tag>
    </>
  );
}
