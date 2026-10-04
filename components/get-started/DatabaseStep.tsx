"use client";

import { useState } from "react";
import { getStarted } from "@/content/get-started";
import { TabList, tabId, tabPanelId } from "@/components/ui/Tabs";
import { PromptBox } from "./PromptBox";
import { StepLabel, StepSub, tabClassName, tabListClassName } from "./step-parts";

const { database } = getStarted;
type Value = (typeof database.tabs)[number]["value"];
const ID_BASE = "database";

/** A prompt per database host, for the reader to hand to their coding agent. */
export function DatabaseStep() {
  const [value, setValue] = useState<Value>(database.tabs[0].value);
  const tab = database.tabs.find((candidate) => candidate.value === value) ?? database.tabs[0];
  return (
    <div className="grid min-w-0 gap-3.5">
      <StepLabel>{database.label}</StepLabel>
      <StepSub>{database.sub}</StepSub>
      <TabList
        label={database.tabsLabel}
        idBase={ID_BASE}
        tabs={database.tabs}
        value={value}
        onChange={setValue}
        className={tabListClassName}
        tabClassName={tabClassName}
      />
      <PromptBox
        prompt={tab.prompt}
        role="tabpanel"
        id={tabPanelId(ID_BASE, tab.value)}
        aria-labelledby={tabId(ID_BASE, tab.value)}
      />
    </div>
  );
}
