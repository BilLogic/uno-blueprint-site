import { canvas } from "@/content/canvas";
import { repairBoard } from "@/content/repair-board";
import { Board, Lane, MockWindow, Note, OptionList, StepDetail } from "@/components/showcase/mock";

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
          <OptionList title={pathsTitle} options={paths} className="mt-2" />
        </>
      }
    />
  );
}

/** A step with no owner, opened beside the board, its owner being typed in. */
export function CheckMock() {
  return (
    <MockWindow
      board={<Board marks={{ user: { 4: "gap" } }} />}
      panel={
        <>
          <StepDetail step={canvas.check.step} />
          <div className="rounded-8 border border-hi-line p-2">{canvas.check.draft}</div>
        </>
      }
    />
  );
}

/** The board cut down for one audience, with the findings to walk them through. */
export function PresentMock() {
  const { title, steps, current, notes, slicesTitle, slices } = canvas.present;
  return (
    <MockWindow
      board={
        <>
          <b>{title}</b>
          <Lane lane={userLane.key} name={userLane.name} steps={steps} marks={{ [current]: "hi" }} />
          {notes.map((note) => (
            <Note key={note}>{note}</Note>
          ))}
        </>
      }
      panel={<OptionList title={slicesTitle} options={slices} firstOpen />}
    />
  );
}
