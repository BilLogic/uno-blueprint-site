"use client";

import { useState } from "react";
import { tabId, tabPanelId } from "@/components/ui/Tabs";
import { selectedTab, type NonEmpty } from "@/lib/get-started";

/**
 * One row of tabs and the panel it controls. The first tab starts selected;
 * `tabListProps` spreads onto `TabList` and `panelProps` onto the panel, so
 * the ids and the ARIA wiring always agree.
 */
export function useTabs<Tabs extends NonEmpty<{ value: string; label: string }>>(idBase: string, tabs: Tabs) {
  const [value, setValue] = useState<Tabs[number]["value"]>(tabs[0].value);
  const tab = selectedTab(tabs, value);
  return {
    tab,
    tabListProps: { idBase, tabs, value, onChange: setValue },
    panelProps: { role: "tabpanel", id: tabPanelId(idBase, tab.value), "aria-labelledby": tabId(idBase, tab.value) },
  } as const;
}
