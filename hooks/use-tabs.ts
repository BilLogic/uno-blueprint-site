"use client";

import { useState, type AnimationEvent } from "react";
import { tabId, tabPanelId } from "@/components/ui/Tabs";
import { selectedTab, type NonEmpty } from "@/lib/get-started";

/**
 * One row of tabs and the panel it controls. The first tab starts selected;
 * `tabListProps` spreads onto `TabList` and `panelProps` onto the panel, so
 * the ids and the ARIA wiring always agree.
 *
 * The panel is keyed by `panelKey`, so a new tab mounts a new panel and the
 * old one goes at once. A panel that has replaced another carries
 * `data-tab-swap`, which plays the swap's motion as it mounts (app/globals.css),
 * until that motion has run: a panel hidden and shown again (the agent view and
 * back) does not play it twice. Picking the tab already shown changes nothing,
 * and the panel the page loads with stays still.
 */
export function useTabs<Tabs extends NonEmpty<{ value: string; label: string }>>(idBase: string, tabs: Tabs) {
  const [value, setValue] = useState<Tabs[number]["value"]>(tabs[0].value);
  const [arriving, setArriving] = useState(false);
  const tab = selectedTab(tabs, value);
  const onChange = (next: Tabs[number]["value"]) => {
    if (next === value) return;
    setValue(next);
    setArriving(true);
  };
  const onAnimationEnd = (event: AnimationEvent<HTMLElement>) => {
    if (event.target === event.currentTarget) setArriving(false);
  };
  return {
    tab,
    panelKey: tab.value,
    tabListProps: { idBase, tabs, value, onChange },
    panelProps: {
      role: "tabpanel",
      id: tabPanelId(idBase, tab.value),
      "aria-labelledby": tabId(idBase, tab.value),
      "data-tab-swap": arriving ? "" : undefined,
      onAnimationEnd,
    },
  } as const;
}
