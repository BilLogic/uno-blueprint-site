import { ArrowUpRight } from "lucide-react";
import { ideas, type Voice } from "@/content/ideas";
import { revealStates } from "@/components/reveal";
import { anchorProps } from "@/components/ui/anchor-props";
import { dataFlag } from "@/components/ui/data-flag";
import { initials, newTabProps } from "@/lib/ideas-timeline";

type VoiceCardProps = {
  voice: Voice;
  /** Cards alternate either side of the line, oldest first on the left. */
  side: "left" | "right";
  row: number;
  /** The line has reached this card. */
  on: boolean;
};

/** A card slides in from the line's side until the line reaches it. */
const sides = {
  left: "col-start-1 motion-safe:scripted:translate-x-4.5",
  right: "col-start-3 motion-safe:scripted:-translate-x-4.5",
} as const;

/** Only a portrait with a recorded permission is shown; everyone else gets initials. */
function Avatar({ voice }: { voice: Voice }) {
  return (
    <span
      aria-hidden
      className="grid size-avatar flex-none place-items-center overflow-hidden rounded-full border border-line bg-card-2 text-13 font-medium text-muted"
    >
      {voice.portrait.status === "cleared" ? (
        <img
          src={voice.portrait.src.src}
          width={voice.portrait.src.width}
          height={voice.portrait.src.height}
          alt=""
          className="block size-full object-cover"
        />
      ) : (
        initials(voice.name)
      )}
    </span>
  );
}

/**
 * One quoted voice, linking to where it was said. The source opens in a new
 * tab, so the reader keeps their place on the timeline; the arrow in the corner
 * shows that, and screen readers hear it after the quote.
 */
export function VoiceCard({ voice, side, row, on }: VoiceCardProps) {
  const newTab = newTabProps(voice.link);
  return (
    <a
      {...anchorProps(voice.link)}
      {...newTab}
      title={voice.source}
      data-voice
      data-on={dataFlag(on)}
      // Each card spans two rows so the two columns interleave down the line.
      style={{ gridRow: `${row} / span 2` }}
      className={`group relative mb-6.5 block self-start rounded-16 border border-line-2 bg-panel p-5 text-ink [transition:opacity_var(--duration-t-3)_var(--ease-out),translate_var(--duration-t-4)_var(--ease-out),border-color_var(--duration-t-rail)] hover:border-muted motion-safe:scripted:opacity-0 data-on:translate-x-0 data-on:opacity-100 motion-reduce:transition-none max-md:hidden ${sides[side]}`}
    >
      {/* Fades in at the card border's pace and easing, rather than the quicker fade of the other revealed controls. */}
      <ArrowUpRight
        data-arrow
        aria-hidden
        strokeWidth={1.75}
        className={`absolute top-5 right-5 size-icon-sm text-muted ${revealStates} transition-opacity duration-t-rail ease-plain motion-reduce:transition-none`}
      />
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
      <p className="mt-3 text-14 text-pretty text-muted">
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
      {newTab && <span className="sr-only"> {ideas.newTab}</span>}
    </a>
  );
}
