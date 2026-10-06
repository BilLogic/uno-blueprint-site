"use client";

import { getStarted } from "@/content/get-started";
import { TabList } from "@/components/ui/Tabs";
import { useTabs } from "@/hooks/use-tabs";
import { PromptBox } from "./PromptBox";
import { StepLabel, StepSub, tabClassName, tabListClassName } from "./step-parts";

const { database } = getStarted;

/** A prompt per database host, for the reader to hand to their coding agent. */
export function DatabaseStep() {
  const { tab, panelKey, tabListProps, panelProps } = useTabs("database", database.tabs);
  return (
    <div className="grid min-w-0 gap-3.5">
      <StepLabel>{database.label}</StepLabel>
      <StepSub>{database.sub}</StepSub>
      <TabList {...tabListProps} label={database.tabsLabel} className={tabListClassName} tabClassName={tabClassName} />
      <PromptBox key={panelKey} {...panelProps} prompt={tab.prompt} />
    </div>
  );
}
