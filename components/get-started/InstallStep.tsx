"use client";

import { getStarted } from "@/content/get-started";
import { GitHubMark } from "@/components/icons/GitHubMark";
import { anchorProps } from "@/components/ui/anchor-props";
import { TabList } from "@/components/ui/Tabs";
import { useTabs } from "@/hooks/use-tabs";
import { CodeBlock } from "./CodeBlock";
import { StepLabel, tabClassName, tabListClassName } from "./step-parts";

const { install } = getStarted;

export function InstallStep() {
  const { tab, panelKey, tabListProps, panelProps } = useTabs("install", install.tabs);
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
        {...tabListProps}
        label={install.tabsLabel}
        className={tabListClassName}
        tabClassName={tabClassName}
      />
      <CodeBlock key={panelKey} {...panelProps} code={tab.code} className="min-h-install" />
    </div>
  );
}
