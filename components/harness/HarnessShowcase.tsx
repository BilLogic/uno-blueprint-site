"use client";

import { Presentation, SearchCheck } from "lucide-react";
import { useCallback, useEffect, useReducer, useState, type ComponentType } from "react";
import { harness, skill as skillOf, type SkillId } from "@/content/harness";
import { TabList, tabId, tabPanelId } from "@/components/ui/Tabs";
import { useInView } from "@/hooks/use-in-view";
import { HARNESS_HOLD, HARNESS_LOOP_START, harnessLoop } from "@/lib/harness-loop";
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
 * with what the skill does underneath. A picture plays when the stage comes
 * into view and again on each tab; once it finishes it holds its last frame,
 * then plays again from the start, for as long as the stage stays in view.
 * The slice picture loops by itself.
 */
export function HarnessShowcase() {
  const [skill, setSkill] = useState<SkillId>("map");
  const [loop, dispatch] = useReducer(harnessLoop, HARNESS_LOOP_START);
  const [stage, inView] = useInView<HTMLDivElement>({ threshold: 0.3 });
  if (inView !== loop.shown) dispatch(inView ? "shown" : "hidden");

  useEffect(() => {
    if (!loop.holding) return;
    const timer = window.setTimeout(() => dispatch("held"), HARNESS_HOLD);
    return () => clearTimeout(timer);
  }, [loop.holding]);

  const restart = useCallback(() => dispatch("restart"), []);
  const done = useCallback(() => dispatch("done"), []);
  const choose = (next: SkillId) => {
    setSkill(next);
    restart();
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
        className="relative aspect-video max-w-full overflow-hidden rounded-16 border border-line bg-card bg-dots max-lg:aspect-auto"
      >
        {/* A new key starts the picture from its first frame. */}
        <Picture key={`${skill}-${loop.run}`} running={loop.shown} onStale={restart} onDone={done} />
      </div>
      <p id={CAPTION_ID} className="mt-4 flex justify-between gap-6 text-14 text-muted">
        <span className="max-w-caption">
          <b className="font-medium text-ink">{current.label}.</b> {current.caption}
        </span>
      </p>
    </>
  );
}
