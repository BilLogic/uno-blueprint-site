"use client";

import { useState } from "react";
import { getStarted } from "@/content/get-started";
import { TabList, tabId, tabPanelId } from "@/components/ui/Tabs";
import { CodeBlock } from "./CodeBlock";
import { CopyButton } from "./CopyButton";
import { StepLabel, StepSub, revealCopy, tabClassName, tabListClassName } from "./step-parts";

const { skills } = getStarted;
type Value = (typeof skills.tabs)[number]["value"];
const ID_BASE = "skills";

export function SkillsStep() {
  const [value, setValue] = useState<Value>(skills.tabs[0].value);
  const tab = skills.tabs.find((candidate) => candidate.value === value) ?? skills.tabs[0];
  return (
    <div className="grid min-w-0 gap-3.5">
      <StepLabel>{skills.label}</StepLabel>
      <StepSub>{skills.sub}</StepSub>
      <TabList
        label={skills.tabsLabel}
        idBase={ID_BASE}
        tabs={skills.tabs}
        value={value}
        onChange={setValue}
        className={`mt-1 ${tabListClassName}`}
        tabClassName={tabClassName}
      />
      {/* The commands, the note and the way each skill is called all change with the agent. */}
      <div
        role="tabpanel"
        id={tabPanelId(ID_BASE, tab.value)}
        aria-labelledby={tabId(ID_BASE, tab.value)}
        className="grid min-w-0 gap-3.5"
      >
        <CodeBlock code={tab.code} />
        <p className="mt-2.5 mb-3.5 text-14 text-muted">{tab.note}</p>
        <ul className="grid gap-0.5 rounded-12 bg-term p-1.5 text-term-ink">
          {skills.list.map(({ name, does }) => {
            const call = `${tab.prefix}${name}`;
            return (
              <li
                key={name}
                className="group relative grid grid-cols-[minmax(0,var(--spacing-skill-name))_minmax(0,1fr)] items-baseline gap-x-4.5 gap-y-0.5 rounded-8 py-2.5 pr-12 pl-3 transition-[background-color] duration-t-1 ease-plain hover:bg-term-hover"
              >
                <code className="font-mono text-13 text-term-key wrap-anywhere">{call}</code>
                <span className="text-13 text-term-faint">{does}</span>
                <CopyButton text={call} tone="term" className={`top-1.75 right-1.75 ${revealCopy}`} />
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
