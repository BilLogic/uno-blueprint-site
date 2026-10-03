"use client";

import { useState } from "react";
import { getStarted } from "@/content/get-started";
import { GitHubMark } from "@/components/icons/GitHubMark";
import { anchorProps } from "@/components/ui/anchor-props";
import { TabList, tabId, tabPanelId } from "@/components/ui/Tabs";
import { CodeBlock } from "./CodeBlock";
import { StepLabel, tabClassName, tabListClassName } from "./step-parts";

const { install } = getStarted;
type Value = (typeof install.tabs)[number]["value"];
const ID_BASE = "install";

export function InstallStep() {
  const [value, setValue] = useState<Value>(install.tabs[0].value);
  const tab = install.tabs.find((candidate) => candidate.value === value) ?? install.tabs[0];
  return (
    <div className="grid min-w-0 gap-3.5">
      <div className="flex items-center justify-between">
        <StepLabel>{install.label}</StepLabel>
        <a
          {...anchorProps(install.github.link)}
          aria-label={install.github.label}
          className="grid size-8 place-items-center rounded-8 text-muted transition-[color] duration-t-1 ease-plain hover:text-ink"
        >
          <GitHubMark className="size-6" />
        </a>
      </div>
      <TabList
        label={install.tabsLabel}
        idBase={ID_BASE}
        tabs={install.tabs}
        value={value}
        onChange={setValue}
        className={tabListClassName}
        tabClassName={tabClassName}
      />
      <CodeBlock
        code={tab.code}
        role="tabpanel"
        id={tabPanelId(ID_BASE, tab.value)}
        aria-labelledby={tabId(ID_BASE, tab.value)}
        className="min-h-install"
      />
    </div>
  );
}
