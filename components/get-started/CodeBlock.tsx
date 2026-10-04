import type { ComponentPropsWithoutRef } from "react";
import type { CodeContent } from "@/content/get-started";
import { commandText, noteLine } from "@/lib/get-started";
import { CopyButton } from "./CopyButton";

type CodeBlockProps = { code: CodeContent } & Omit<ComponentPropsWithoutRef<"div">, "children">;

/**
 * A terminal box with a copy button. Each command is its own line, and one too
 * long for the box wraps at a space with a hanging indent, so a wrapped
 * command never reads as two. A note sits above the commands as a shell
 * comment, and the copy leaves it out, so what is pasted still runs as typed.
 */
export function CodeBlock({ code, className = "", ...props }: CodeBlockProps) {
  const text = code.kind === "commands" ? commandText(code.lines) : code.text;
  return (
    <div
      {...props}
      className={`relative rounded-12 bg-term py-4 pr-14 pl-4.5 font-mono text-13 leading-command text-term-ink wrap-anywhere ${className}`}
    >
      {code.kind === "commands" ? (
        <code className="block">
          {code.note && (
            <span className="block -indent-hang pl-hang whitespace-pre-wrap wrap-break-word text-term-faint">
              {noteLine(code.note)}
            </span>
          )}
          {code.lines.map((line) => (
            <span key={line} className="block -indent-hang pl-hang whitespace-pre-wrap wrap-break-word">
              {line}
            </span>
          ))}
        </code>
      ) : (
        <p className="whitespace-pre-wrap">{code.text}</p>
      )}
      <CopyButton text={text} tone="term" className="top-2.5 right-2.5" />
    </div>
  );
}
