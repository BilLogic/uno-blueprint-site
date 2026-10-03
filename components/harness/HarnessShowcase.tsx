"use client";

import { Presentation, RotateCcw, SearchCheck } from "lucide-react";
import { useCallback, useState, type ComponentType } from "react";
import { harness, skill as skillOf, type SkillId } from "@/content/harness";
import { TabList, tabId, tabPanelId } from "@/components/ui/Tabs";
import { useInView } from "@/hooks/use-in-view";
import { AuditPicture } from "./AuditPicture";
import { MapPicture } from "./MapPicture";
import type { PictureProps } from "./pictures";
import { BranchIcon, FilePlusIcon } from "./SkillIcons";
import { SlicePicture } from "./SlicePicture";
import { WhatIfPicture } from "./WhatIfPicture";

const ID_BASE = "harness";
const CAPTION_ID = "harness-caption";
const icon = { className: "size-4", strokeWidth: 1.75 } as const;

const pictures: Record<SkillId, ComponentType<PictureProps>> = {
  map: MapPicture,
  slice: SlicePicture,
  audit: AuditPicture,
  whatif: WhatIfPicture,
};

const tabs = harness.skills.map((skill) => ({
  value: skill.id,
  label: skill.label,
  icon: {
    map: <FilePlusIcon />,
    slice: <Presentation {...icon} />,
    audit: <SearchCheck {...icon} />,
    whatif: <BranchIcon />,
  }[skill.id],
}));

/**
 * The four skills behind one tab row: a picture of each on a dotted stage,
 * with what the skill does underneath. A picture plays once when the stage
 * comes into view, again on each tab, and again from the button in its corner;
 * the slice picture loops by itself, so it has no button.
 */
export function HarnessShowcase() {
  const [skill, setSkill] = useState<SkillId>("map");
  const [run, setRun] = useState(0);
  const [asked, setAsked] = useState(false);
  const [stage, seen] = useInView<HTMLDivElement>({ threshold: 0.3, once: true });
  const running = seen || asked;

  const replay = useCallback(() => {
    setAsked(true);
    setRun((n) => n + 1);
  }, []);
  const choose = (next: SkillId) => {
    setSkill(next);
    replay();
  };

  const current = skillOf(skill);
  const Picture = pictures[skill];

  return (
    <>
      <TabList
        label={harness.tabsLabel}
        idBase={ID_BASE}
        tabs={tabs}
        value={skill}
        onChange={choose}
        className="mb-4 flex flex-wrap gap-2"
        tabClassName="inline-flex cursor-pointer items-center gap-2 rounded-pill border border-line bg-panel px-3.5 py-2.5 text-14 leading-none font-medium text-muted aria-selected:border-ink aria-selected:text-ink"
      />
      <div
        ref={stage}
        role="tabpanel"
        id={tabPanelId(ID_BASE, skill)}
        aria-labelledby={tabId(ID_BASE, skill)}
        aria-describedby={CAPTION_ID}
        className="relative aspect-video max-w-full overflow-hidden rounded-16 border border-line bg-card bg-[radial-gradient(var(--color-line-2)_1px,transparent_1px)] bg-size-[18px_18px] max-lg:aspect-auto"
      >
        {/* A new key starts the picture from its first frame. */}
        <Picture key={`${skill}-${run}-${running}`} running={running} onStale={replay} />
        {skill === "slice" ? null : (
          <button
            type="button"
            aria-label={harness.replay}
            title={harness.replay}
            onClick={replay}
            className="absolute top-2.5 right-2.5 z-6 grid size-8 cursor-pointer place-items-center rounded-8 border border-line-2 bg-panel text-muted transition-[color,border-color] duration-t-1 motion-reduce:transition-none hover:border-line-hot hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand max-lg:top-2 max-lg:right-2"
          >
            <RotateCcw className="size-icon-sm" strokeWidth={1.75} />
          </button>
        )}
      </div>
      <p id={CAPTION_ID} className="mt-4 flex justify-between gap-6 text-14 text-muted">
        <span className="max-w-[70ch]">
          <b className="font-medium text-ink">{current.label}.</b> {current.caption}
        </span>
      </p>
    </>
  );
}
