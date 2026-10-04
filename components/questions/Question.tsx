"use client";

import { useId, useState } from "react";

type QuestionProps = { question: string; answer: string };

/**
 * One question that opens to its answer (the WAI-ARIA disclosure pattern).
 * The answer's row grows from nothing on the prototype's curve; once it has
 * closed it is hidden outright, so a closed answer is neither read nor focused.
 * A rule runs under every question and none above the first, whose text sits
 * level with the section heading's first line instead.
 */
export function Question({ question, answer }: QuestionProps) {
  const [open, setOpen] = useState(false);
  const answerId = useId();
  return (
    <div data-open={open || undefined} className="group border-b border-line">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={answerId}
          onClick={() => setOpen((wasOpen) => !wasOpen)}
          className="flex w-full cursor-pointer items-center justify-between gap-4 py-4.5 text-left group-first:pt-0 md:group-first:pt-question-lead font-medium transition-[color] duration-t-1 ease-plain hover:text-brand focus-visible:rounded-6 focus-visible:outline-brand"
        >
          {question}
          <PlusMinus />
        </button>
      </h3>
      <div
        id={answerId}
        className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-t-3 ease-io group-data-open:grid-rows-[1fr] motion-reduce:transition-none"
      >
        <div className="invisible min-h-0 overflow-hidden transition-[visibility] delay-(--duration-t-3) duration-0 group-data-open:visible group-data-open:delay-0 motion-reduce:transition-none">
          <p className="max-w-answer -translate-y-1 pb-4.5 text-muted opacity-0 transition-[opacity,translate] duration-[var(--duration-t-2),var(--duration-t-3)] ease-out group-data-open:translate-y-0 group-data-open:opacity-100 group-data-open:delay-(--duration-answer-lag) motion-reduce:transition-none">
            {answer}
          </p>
        </div>
      </div>
    </div>
  );
}

/** A plus whose upright bar turns flat as it opens, leaving a minus. */
function PlusMinus() {
  const bar =
    "before:absolute before:inset-x-0 before:inset-y-0 before:my-auto before:h-bar before:rounded-1 before:bg-current before:content-[''] after:absolute after:inset-x-0 after:inset-y-0 after:my-auto after:h-bar after:rounded-1 after:bg-current after:content-['']";
  return (
    <span
      aria-hidden
      className={`relative block size-3.25 flex-none text-muted transition-transform duration-t-3 ease-io group-data-open:rotate-180 after:rotate-90 after:transition-transform after:duration-t-3 after:ease-io group-data-open:after:rotate-0 motion-reduce:transition-none motion-reduce:after:transition-none ${bar}`}
    />
  );
}
