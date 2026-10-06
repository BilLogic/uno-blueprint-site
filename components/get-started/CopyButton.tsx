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

/**
 * Both icons sit in the same cell, and the one not showing is blurred, faded
 * and shrunk, so the copy icon and the tick trade places through a blur, each
 * way. With reduced motion they swap at once.
 */
const icon =
  "col-start-1 row-start-1 transition-[opacity,filter,scale] duration-(--duration-copy-swap) ease-copy-swap motion-reduce:transition-none";
const showing = "opacity-100 [filter:blur(0)] [scale:1]";
const hidden = "opacity-0 [filter:blur(var(--blur-copy-swap))] [scale:var(--scale-copy-swap)]";

/** Copies `text` and shows a tick for a moment; the tick is announced as well as shown. */
export function CopyButton({ text, tone, className }: CopyButtonProps) {
  const [copied, copy] = useCopy();
  return (
    <>
      <button
        type="button"
        aria-label={getStarted.copy.label}
        onClick={() => copy(text)}
        className={`absolute grid size-7.5 cursor-pointer place-items-center rounded-8 border [&_svg]:size-3.75 ${tones[tone]} ${className}`}
      >
        <Copy aria-hidden strokeWidth={1.75} className={`${icon} ${copied ? hidden : showing}`} />
        <Check aria-hidden strokeWidth={1.75} className={`${icon} ${copied ? showing : hidden}`} />
      </button>
      <span role="status" className="sr-only">
        {copied ? getStarted.copy.done : ""}
      </span>
    </>
  );
}
