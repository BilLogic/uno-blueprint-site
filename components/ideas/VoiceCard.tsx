import type { CSSProperties } from "react";
import { ArrowUpRight } from "lucide-react";
import { ideas, type Person, type Voice } from "@/content/ideas";
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
function Disc({ person, className = "", style }: { person: Person; className?: string; style?: CSSProperties }) {
  return (
    <span
      aria-hidden
      style={style}
      className={`grid size-avatar flex-none place-items-center overflow-hidden rounded-full border border-line bg-card-2 text-13 font-medium text-muted ${className}`}
    >
      {person.portrait.status === "cleared" ? (
        <img
          src={person.portrait.src.src}
          width={person.portrait.src.width}
          height={person.portrait.src.height}
          alt=""
          className="block size-full object-cover"
        />
      ) : (
        initials(person.name)
      )}
    </span>
  );
}

/**
 * Co-authors sit behind the named voice, to its left, each overlapping the one
 * before by a third and ringed in the card's colour. The stack always takes the
 * spread width, with the named voice's disc against the name, so the spread
 * moves nothing else on the card. Hovering or focusing the card spreads the
 * co-authors leftward, one a beat after the other; with no hover to wait for,
 * or with reduced motion, they are spread from the start.
 */
const behind =
  "relative -mr-avatar-overlap ring-2 ring-panel [transition:margin-right_var(--duration-avatar-spread)_var(--ease-copy-swap)] group-hover:mr-avatar-spread group-focus-within:mr-avatar-spread [@media(hover:none)]:mr-avatar-spread motion-reduce:mr-avatar-spread motion-reduce:transition-none";

/** The names are in the card's text, so the discs stay hidden from screen readers. */
function Avatars({ voice }: { voice: Voice }) {
  const people: readonly Person[] = [voice, ...(voice.coauthors ?? [])];
  if (people.length === 1) return <Disc person={voice} />;
  const gaps = people.length - 1;
  return (
    <span
      data-stack
      style={{ width: `calc(${people.length} * var(--spacing-avatar) + ${gaps} * var(--spacing-avatar-spread))` }}
      // Reversed, so the named voice comes first in the markup but sits on the right, by the name.
      className="isolate flex flex-none flex-row-reverse"
    >
      {people.map((person, i) => (
        <Disc
          key={person.name}
          person={person}
          className={i === 0 ? "relative ring-2 ring-panel" : behind}
          style={{
            // The named voice in front, and each co-author behind the one before.
            zIndex: people.length - i,
            ...(i > 1 && { transitionDelay: `calc(${i - 1} * var(--duration-stagger))` }),
          }}
        />
      ))}
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
        <Avatars voice={voice} />
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
