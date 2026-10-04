import type { ComponentPropsWithoutRef } from "react";
import { CopyButton } from "./CopyButton";
import { revealCopy } from "./step-parts";

type PromptBoxProps = { prompt: string } & Omit<ComponentPropsWithoutRef<"div">, "children">;

/** A prompt for the reader's coding agent, in a panel whose copy button shows on hover or focus. */
export function PromptBox({ prompt, className = "", ...props }: PromptBoxProps) {
  return (
    <div {...props} className={`group relative grid rounded-12 border border-line bg-panel py-3.5 pr-13 pl-4 ${className}`}>
      <p className="text-14 text-muted">{prompt}</p>
      <CopyButton text={prompt} tone="panel" className={`top-2.5 right-2.5 ${revealCopy}`} />
    </div>
  );
}
