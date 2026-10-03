"use client";

import { Check, Copy } from "lucide-react";
import { getStarted } from "@/content/get-started";
import { useCopy } from "@/hooks/use-copy";

const tones = {
  term: "border-term-edge bg-term-raised text-term-muted",
  panel: "border-line bg-card text-muted",
} as const;

type CopyButtonProps = {
  text: string;
  tone: keyof typeof tones;
  /** Placement inside the box it copies from. */
  className: string;
};

/** Copies `text` and shows a tick for a moment; the tick is announced as well as shown. */
export function CopyButton({ text, tone, className }: CopyButtonProps) {
  const [copied, copy] = useCopy();
  const Icon = copied ? Check : Copy;
  return (
    <>
      <button
        type="button"
        aria-label={getStarted.copy.label}
        onClick={() => copy(text)}
        className={`absolute grid size-7.5 cursor-pointer place-items-center rounded-8 border [&_svg]:size-3.75 ${tones[tone]} ${className}`}
      >
        <Icon aria-hidden strokeWidth={1.75} />
      </button>
      <span role="status" className="sr-only">
        {copied ? getStarted.copy.done : ""}
      </span>
    </>
  );
}
