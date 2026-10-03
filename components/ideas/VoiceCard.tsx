import type { CSSProperties } from "react";
import type { Voice } from "@/content/ideas";
import { anchorProps } from "@/components/ui/anchor-props";
import { initials } from "@/lib/ideas-timeline";

type VoiceCardProps = {
  voice: Voice;
  /** Cards alternate either side of the line, oldest first on the left. */
  side: "left" | "right";
  row: number;
  /** The line has reached this card. */
  on: boolean;
};

const sides = {
  left: "col-start-1 translate-x-4.5",
  right: "col-start-3 -translate-x-4.5",
} as const;

/** Only a portrait with a recorded permission is shown; everyone else gets initials. */
function Avatar({ voice }: { voice: Voice }) {
  return (
    <span
      aria-hidden
      className="grid size-avatar flex-none place-items-center overflow-hidden rounded-full border border-line bg-card-2 text-13 font-medium text-muted"
    >
      {voice.portrait.status === "cleared" ? (
        <img src={voice.portrait.src} alt="" className="block size-full object-cover" />
      ) : (
        initials(voice.name)
      )}
    </span>
  );
}

/** One quoted voice, linking to where it was said. */
export function VoiceCard({ voice, side, row, on }: VoiceCardProps) {
  return (
    <a
      {...anchorProps(voice.link)}
      title={voice.source}
      data-voice
      data-on={on ? "" : undefined}
      // Each card spans two rows so the two columns interleave down the line.
      style={{ gridRow: `${row} / span 2` } as CSSProperties}
      className={`mb-6.5 block self-start rounded-16 border border-line-2 bg-panel p-5 text-ink opacity-0 [transition:opacity_var(--duration-t-3)_var(--ease-out),translate_var(--duration-t-4)_var(--ease-out),border-color_var(--duration-t-rail)] hover:border-muted data-on:translate-x-0 data-on:opacity-100 motion-reduce:translate-x-0 motion-reduce:opacity-100 motion-reduce:transition-none max-md:hidden ${sides[side]}`}
    >
      <span className="mb-3 flex gap-2.5 text-12 leading-caption font-medium text-muted">
        <b className="font-medium text-ink">{voice.date}</b>
        {voice.field}
      </span>
      <span className="flex items-center gap-2">
        <Avatar voice={voice} />
        <span className="text-14 leading-4.5 font-medium">
          {voice.name}
          <small className="block text-12-5 leading-4.5 font-normal text-muted">{voice.role}</small>
        </span>
      </span>
      <p className="mt-3 text-14 text-muted">
        {voice.quote.map((run, i) =>
          typeof run === "string" ? (
            run
          ) : (
            <mark key={i} className="bg-transparent font-medium text-ink">
              {run.mark}
            </mark>
          ),
        )}
      </p>
    </a>
  );
}
