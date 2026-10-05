import { canvas } from "@/content/canvas";
import { repairBoard } from "@/content/repair-board";
import { mergePaths, partedColumns } from "@/lib/path-merge";
import { Board, Cell, Lane, LaneRow, MockWindow, Note, OptionList, StepDetail, Tag } from "@/components/showcase/mock";

const userLane = repairBoard.lanes[0];

/** The whole board, with the service's phases and paths beside it. */
export function UnderstandMock() {
  const { phasesTitle, phases, pathsTitle, paths } = canvas.understand;
  return (
    <MockWindow
      board={<Board />}
      panel={
        <>
          <OptionList title={phasesTitle} options={phases} firstOpen />
          <OptionList title={pathsTitle} options={paths} titleClassName="mt-2" />
        </>
      }
    />
  );
}

/** A step with no owner, opened beside the board, its owner being typed in. */
export function CheckMock() {
  return (
    <MockWindow
      board={<Board marks={canvas.check.marks} />}
      panel={
        <>
          <StepDetail step={canvas.check.step} />
          <div className="rounded-8 border border-hi-line p-2">{canvas.check.draft}</div>
        </>
      }
    />
  );
}

/**
 * A path's tag on a parted step, its name wrapping inside a narrow slot. Up to
 * 1000 px wide, where the cells are bars, the name stays, in smaller type.
 */
const pathTag = "max-w-full leading-tight max-xl:px-1 max-xl:text-tag-narrow";

/** Each path's own steps where it parts from the board, by path; a path not named follows the board. */
const swaps: Readonly<Partial<Record<string, Readonly<Partial<Record<string, string>>>>>> = canvas.compare.swaps;

/**
 * Two paths merged on one board: one set of lanes and one step axis. Where the
 * paths agree a slot draws one cell; at the booking step, where they part, it
 * holds a cell for each path, tagged with the path. Up to 1000 px wide the
 * parted slots take more room, so the path names fit. A toggle beside the
 * board's title shows the merged view open, and the side panel lists both paths.
 */
export function CompareMock() {
  const { views, open, title } = canvas.compare;
  const { pathsTitle, paths } = canvas.understand;
  const lanes = repairBoard.lanes.map((lane) => ({
    lane,
    slots: mergePaths(
      paths.map((path) => ({
        path,
        steps: lane.steps.map((step) => swaps[path]?.[step] ?? step),
      })),
    ),
  }));
  const narrowColumns = partedColumns(
    repairBoard.lanes[0].steps.length,
    lanes.flatMap(({ slots }) => slots.flatMap((slot, index) => ("apart" in slot ? [index] : []))),
  );
  return (
    <MockWindow
      board={
        <>
          <div className="flex min-w-0 items-center justify-between gap-3">
            <b className="min-w-0 truncate">{title}</b>
            <span className="flex flex-none gap-0.5 rounded-pill border border-line p-0.5 text-11 leading-normal font-medium">
              {views.map((view) => (
                <span
                  key={view}
                  className={`rounded-pill px-(--spacing-tag-x) py-0.5 ${view === open ? "bg-hi text-link" : "text-muted"}`}
                >
                  {view}
                </span>
              ))}
            </span>
          </div>
          {lanes.map(({ lane, slots }) => (
            <LaneRow key={lane.key} lane={lane.key} name={lane.name} count={lane.steps.length} narrowColumns={narrowColumns}>
              {slots.map((slot, index) =>
                "step" in slot ? (
                  <Cell key={index} className="self-center">
                    {slot.step}
                  </Cell>
                ) : (
                  <span key={index} data-testid="parted-slot" className="grid content-start gap-1">
                    {slot.apart.map(({ path, step }) => (
                      <span key={path} className="grid gap-0.5">
                        <Tag className={pathTag} testId="path-tag">
                          {path}
                        </Tag>
                        <Cell mark="hi">{step}</Cell>
                      </span>
                    ))}
                  </span>
                ),
              )}
            </LaneRow>
          ))}
        </>
      }
      panel={
        <>
          <b>{pathsTitle}</b>
          {paths.map((path) => (
            <Tag key={path}>{path}</Tag>
          ))}
        </>
      }
    />
  );
}

/** The board cut down for one audience, with the findings to walk them through. */
export function PresentMock() {
  const { title, steps, marks, notes, slicesTitle, slices } = canvas.present;
  return (
    <MockWindow
      board={
        <>
          <b>{title}</b>
          <Lane lane={userLane.key} name={userLane.name} steps={steps} marks={marks} />
          {notes.map((note, index) => (
            <Note key={index}>{note}</Note>
          ))}
        </>
      }
      panel={<OptionList title={slicesTitle} options={slices} firstOpen />}
    />
  );
}
