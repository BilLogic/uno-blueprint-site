import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";

/*
 * The parts every harness picture shares: what you have, the skill, what you
 * get, left to right; stacked top to bottom on a narrow screen, at a size that
 * reads, with the frame taking the height the picture needs. Sizes inside a
 * picture are in em of the picture's type, so the drawing scales as one.
 */

type FlowProps = ComponentPropsWithoutRef<"div"> & { ref?: Ref<HTMLDivElement> };

export function Flow({ className = "", ...props }: FlowProps) {
  return (
    <div
      className={`absolute inset-[60px_44px_32px] grid items-center text-[clamp(12px,1.02vw,13px)] max-lg:relative max-lg:inset-auto max-lg:grid-cols-[minmax(0,1fr)] max-lg:gap-0 max-lg:px-3.5 max-lg:pt-4.5 max-lg:pb-5 max-lg:text-13 ${className}`}
      {...props}
    />
  );
}

/** The usual proportions; the map gives its two sides more room. */
export const flowColumns = "grid-cols-[minmax(0,1fr)_auto_minmax(0,1.05fr)] gap-11";

export function Side({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid min-w-0 content-center gap-2">
      <span className="text-12 font-medium text-muted">{label}</span>
      {children}
    </div>
  );
}

/** A short arrow into or out of the skill: beside it in a row, above and below it in a stack. */
function Arrow({ side, stackedOnly }: { side: "in" | "out"; stackedOnly: boolean }) {
  const place =
    side === "in"
      ? "left-[-2.5em] max-lg:top-[-1.75em]"
      : "right-[-2.5em] max-lg:top-auto max-lg:bottom-[-1.75em]";
  return (
    <svg
      viewBox="0 0 24 12"
      aria-hidden="true"
      className={`absolute top-1/2 -mt-[.45em] h-[.9em] w-[1.7em] text-line-hot max-lg:right-auto max-lg:left-1/2 max-lg:mt-0 max-lg:-ml-[.85em] max-lg:rotate-90 ${place} ${stackedOnly ? "hidden max-lg:block" : ""}`}
    >
      <path
        d="M1 6h21M17 1.5 22 6l-5 4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type SkillProps = {
  command: string;
  /** Each change replays the ring, as something passes through the skill. */
  pings: number;
  /** The map draws its own lines beside the skill, so it sits on a card above them. */
  raised?: boolean;
  nameRef?: Ref<HTMLSpanElement>;
};

export function Skill({ command, pings, raised = false, nameRef }: SkillProps) {
  return (
    <div
      className={`relative grid justify-items-center gap-2 text-center max-lg:my-[2.6em] max-lg:justify-self-center ${raised ? "z-2 rounded-12 bg-card px-1.5 py-2" : ""}`}
    >
      <Arrow side="in" stackedOnly={raised} />
      <span
        key={pings}
        ref={nameRef}
        className={`rounded-10 bg-term px-[1em] py-[.65em] font-mono text-[1.05em] leading-[normal] font-medium text-term-key ${pings ? "animate-skill-ping motion-reduce:animate-none" : ""}`}
      >
        {command}
      </span>
      <Arrow side="out" stackedOnly={raised} />
    </div>
  );
}

/** The white card a board or a result sits on. */
export function Card({ children }: { children: ReactNode }) {
  return (
    <div className="relative grid gap-1.5 overflow-hidden rounded-12 border border-line-2 bg-panel p-3 shadow-card">
      {children}
    </div>
  );
}
