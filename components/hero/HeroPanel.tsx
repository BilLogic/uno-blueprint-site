import { memo } from "react";
import { hero } from "@/content/hero";
import { panelFill, type Board } from "@/lib/hero-picture";
import { LANE_COLORS } from "./lanes";
import { Glyph } from "./Glyph";
import { ToolIcon } from "./ToolIcon";

const { panel: words, tools } = hero.picture;

const sketch = "block h-1 rounded-2";
const label = "text-11 leading-label font-medium text-muted";
const field = "grid gap-1.5";
const chip = "inline-flex min-w-0 items-center gap-2 rounded-8 border border-line-2 px-2.25 py-1.5 text-faint";

/**
 * The cell a person stopped on, as the canvas's side panel shows it, sketched.
 * It blanks while it changes cell, then each row rises back in. Narrower
 * screens drop the rows the prototype drops: the follow-on links below 1100 px,
 * and the image and tabs on a phone.
 */
type HeroPanelProps = {
  cell: number;
  sources: readonly number[];
  phase: Board["panel"];
  panelRef: (element: HTMLElement | null) => void;
};

// Memoised: the board changes several times a second, the panel only when its cell or phase does.
export const HeroPanel = memo(function HeroPanel({ cell, sources, phase, panelRef }: HeroPanelProps) {
  const fill = panelFill(cell, sources, words.statuses.length);
  const row = `min-w-0 ${phase === "shown" ? "motion-safe:animate-cap-in" : "opacity-0 transition-opacity duration-140"}`;

  return (
    <div
      ref={panelRef}
      className="relative z-1 grid w-hero-panel min-w-0 grid-cols-1 gap-3 justify-self-start rounded-16 border border-line-2 bg-panel p-3.5 text-12 shadow-hero-panel max-md:w-full max-md:justify-self-stretch"
    >
      <div className={`${row} flex items-center gap-1.5 text-faint`}>
        <span className={`${sketch} w-8.5 bg-line-2`} />›<span className={`${sketch} w-8.5 bg-line-2`} />
        <Glyph name="close" className="ml-auto size-3.5" />
      </div>
      <div className={`${row} grid h-26 place-items-center rounded-10 border border-line bg-card text-faint max-md:hidden`}>
        <Glyph name="image" className="size-5.5" />
      </div>
      <div className={`${row} ${field}`}>
        <span className={label}>{words.summary}</span>
        <span className={`${sketch} bg-sketch`} style={{ width: `${fill.summary}%` }} />
        <span className={`${sketch} bg-line-2`} style={{ width: `${fill.summaryShort}%` }} />
      </div>
      <div className={`${row} grid grid-cols-2 gap-2`}>
        <div className={field}>
          <span className={label}>{words.status}</span>
          <span className="inline-flex items-center gap-1.5 justify-self-start rounded-pill border border-line-2 px-2.25 py-0.5 text-11-5 before:size-1.5 before:rounded-full before:bg-brand before:content-['']">
            {words.statuses[fill.status]}
          </span>
        </div>
        <div className={field}>
          <span className={label}>{words.owner}</span>
          <span className="flex items-center gap-1.75">
            <i className={`block size-4.5 flex-none rounded-full border border-line-2 ${LANE_COLORS[fill.lane]}`} />
            <span className={`${sketch} max-w-17.5 flex-1 bg-line-2`} />
          </span>
        </div>
      </div>
      <div className={`${row} ${field} max-2xl:hidden`}>
        <span className={label}>{words.valueProposition}</span>
        <span className={`${sketch} w-7/10 bg-line-2`} />
      </div>
      <div className={`${row} flex gap-2.5 border-b border-line text-11/normal text-faint max-md:hidden`}>
        {words.tabs.map((tab, i) => (
          <span key={tab} className={`pb-1.75 ${i === 0 ? "text-ink shadow-tab" : ""}`}>
            {tab}
          </span>
        ))}
      </div>
      <div className={`${row} grid min-h-14.5 content-start gap-1.75 max-md:min-h-0`}>
        {fill.evidence.length ? (
          fill.evidence.map(({ tool, width }, i) => (
            <div key={i} className="flex items-center gap-2">
              <i className="grid size-5.5 flex-none place-items-center rounded-8 border border-line-2">
                <ToolIcon icon={tools[tool]!.icon} markClassName="size-2.75 fill-muted" lineClassName="size-2.75 text-muted" />
              </i>
              <span className={`${sketch} flex-none bg-line-2`} style={{ width: `${width}%` }} />
            </div>
          ))
        ) : (
          <div className="flex items-center gap-2">
            <span className={`${sketch} w-2/5 flex-none bg-line-2`} />
          </div>
        )}
      </div>
      <div className={`${row} grid grid-cols-2 gap-2 max-2xl:hidden`}>
        <div className={field}>
          <span className={label}>{words.follows}</span>
          <span className={chip}>
            ↓<span className={`${sketch} flex-1 bg-line-2`} />
          </span>
        </div>
        <div className={field}>
          <span className={label}>{words.leadsTo}</span>
          <span className={chip}>
            →<span className={`${sketch} flex-1 bg-line-2`} />
          </span>
        </div>
      </div>
    </div>
  );
});
