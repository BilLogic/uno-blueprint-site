import { Fragment } from "react";
import { touchPoints, type TerminalTone } from "@/content/touch-points";
import { repairBoard } from "@/content/repair-board";
import { Board, MockWindow, StepDetail, Tag } from "@/components/showcase/mock";

/** The built-in agent answers in the side panel, and the two steps it cites light up. */
export function AppMock() {
  const { question, answer, gap } = touchPoints.app;
  return (
    <MockWindow
      board={<Board marks={touchPoints.app.marks} />}
      panel={
        <>
          <div className="rounded-8 bg-card px-(--spacing-bubble-x) py-(--spacing-bubble-y) text-ink">{question}</div>
          <div>
            {answer.map((part, index) => (
              <Fragment key={index}>
                {part.text}
                {"cite" in part && <Tag>{part.cite}</Tag>}
              </Fragment>
            ))}
          </div>
          <Tag amber>{gap}</Tag>
        </>
      }
    />
  );
}

const tones: Record<TerminalTone, string> = {
  command: "text-term-key",
  muted: "text-term-faint",
  plain: "",
  warn: "text-term-amber",
};

/** A coding agent runs a what-if in the terminal; the steps it would change turn amber. */
export function AgentMock() {
  return (
    <MockWindow
      board={<Board marks={touchPoints.agent.marks} />}
      panel={
        <div className="grid gap-(--spacing-term-gap) rounded-8 bg-term p-3 font-mono leading-normal text-term-ink">
          {touchPoints.agent.lines.map((line, index) => (
            <span key={index} className={tones[line.tone]}>
              {line.text}
            </span>
          ))}
        </div>
      }
    />
  );
}

/** A team chat thread where a bot answers from the blueprint, and the step its link opens. */
export function ChatMock() {
  const { channel, messages, step } = touchPoints.chat;
  return (
    <MockWindow
      board={
        <>
          <b>{channel}</b>
          <div className="mt-1.5 grid gap-2.5">
            {messages.map((message, index) =>
              message.kind === "bot" ? (
                <div key={index} className="border-l-2 border-primary pl-2.5">
                  <b>{message.author}</b> · {message.text}
                  <br />
                  <Tag>{message.link}</Tag>
                </div>
              ) : (
                <div key={index}>
                  <b>{message.author}</b> · {message.text}
                </div>
              ),
            )}
          </div>
        </>
      }
      panel={<StepDetail step={step} />}
    />
  );
}

/** On a phone the words would not fit the handset, so they are drawn as a bar, as the board's cells are. */
const barOnPhone =
  "max-sm:text-0 max-sm:before:block max-sm:before:h-1 max-sm:before:w-(--spacing-bar-long) max-sm:before:rounded-2 max-sm:before:bg-bar max-sm:before:content-['']";

/**
 * The journey reader on a phone: a journey, the path it follows, and its steps
 * as a list with the step jumped to lit. The handset stands on the stage's foot
 * and fills its height, so a recording can later take its place at the same size.
 */
export function PhoneMock() {
  const { journey, path, lit } = touchPoints.phone;
  const steps = repairBoard.lanes[0].steps;
  return (
    <div
      aria-hidden="true"
      className="absolute top-(--spacing-phone-top) bottom-0 left-1/2 aspect-phone -translate-x-1/2 overflow-hidden rounded-t-(--radius-phone) border border-b-0 border-line bg-card-2 px-(--spacing-phone-bezel) pt-(--spacing-phone-bezel) text-mock shadow-mock"
    >
      <div className="grid min-h-full content-start gap-2 rounded-t-phone-screen bg-panel px-3 pt-2.5 max-sm:gap-1.5 max-sm:px-2 max-sm:pt-2">
        <span className="mb-1 h-1 w-(--spacing-phone-speaker) justify-self-center rounded-pill bg-line-2" />
        <b className="truncate leading-tight">{journey}</b>
        <span className={`text-11 text-muted ${barOnPhone}`}>{path}</span>
        <ol className="mt-1 grid gap-1.5 max-sm:gap-1">
          {steps.map((step, index) => (
            <li
              key={step}
              className={`flex items-center gap-2 rounded-6 border p-1.5 leading-tight max-sm:gap-1 max-sm:p-1 ${step === lit ? "border-dashed border-brand bg-brand-soft" : "border-line-2 bg-panel"}`}
            >
              <span
                className={`grid size-(--spacing-phone-step) flex-none place-items-center rounded-full text-11 font-medium max-sm:size-3 max-sm:text-0 ${step === lit ? "bg-brand text-panel" : "bg-card-2 text-muted"}`}
              >
                {index + 1}
              </span>
              <span className={`min-w-0 flex-1 truncate ${barOnPhone}`}>{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
