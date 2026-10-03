import { Fragment } from "react";
import { touchPoints, type TerminalTone } from "@/content/touch-points";
import { Board, MockWindow, StepDetail, Tag } from "@/components/showcase/mock";

/** The built-in agent answers in the side panel, and the two steps it cites light up. */
export function AppMock() {
  const { question, answer, gap } = touchPoints.app;
  return (
    <MockWindow
      board={<Board marks={{ user: { 2: "hi", 3: "hi" } }} />}
      panel={
        <>
          <div className="rounded-8 bg-card px-(--spacing-bubble-x) py-(--spacing-bubble-y) text-ink">{question}</div>
          <div>
            {answer.map((part) => (
              <Fragment key={part.text}>
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
  command: "text-term-green",
  muted: "text-term-muted",
  plain: "",
  warn: "text-term-amber",
};

/** A coding agent runs a what-if in the terminal; the steps it would change turn amber. */
export function AgentMock() {
  return (
    <MockWindow
      board={<Board marks={{ user: { 0: "hi", 1: "warn", 2: "warn" }, front: { 0: "warn" } }} />}
      panel={
        <div className="grid gap-0.75 rounded-8 bg-term p-3 font-mono leading-normal text-term-ink">
          {touchPoints.agent.lines.map((line) => (
            <span key={line.text} className={tones[line.tone]}>
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
            {messages.map((message) =>
              "bot" in message ? (
                <div key={message.text} className="border-l-2 border-primary pl-2.5">
                  <b>{message.author}</b> · {message.text}
                  <br />
                  <Tag>{message.link}</Tag>
                </div>
              ) : (
                <div key={message.text}>
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
