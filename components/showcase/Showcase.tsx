"use client";

import { useState, type ReactNode } from "react";
import { TabList, tabId, tabPanelId } from "@/components/ui/Tabs";

export type ShowcaseItem<T extends string> = {
  value: T;
  label: string;
  icon: ReactNode;
  /** What the picture is about; it follows the tab's label under the stage. */
  caption: string;
  /** The mock drawn on the stage while this tab is selected. */
  picture: ReactNode;
};

type ShowcaseProps<T extends string> = {
  /** Prefix for the ids of the tabs and their panels. */
  idBase: string;
  /** Names the tab row for assistive technology. */
  label: string;
  items: readonly ShowcaseItem<T>[];
};

/**
 * A row of pill tabs over a framed stage with a caption under it. Selecting a
 * tab swaps the stage's picture and the caption; the two together are the
 * tab's panel.
 */
export function Showcase<T extends string>({ idBase, label, items }: ShowcaseProps<T>) {
  const [value, setValue] = useState(items[0]?.value);
  const item = items.find((candidate) => candidate.value === value) ?? items[0];
  if (!item) return null;

  return (
    <>
      <TabList
        label={label}
        idBase={idBase}
        tabs={items}
        value={item.value}
        onChange={setValue}
        className="mb-4 flex flex-wrap gap-2"
        tabClassName="inline-flex cursor-pointer items-center gap-2 rounded-pill border border-line bg-panel px-3.5 py-2.5 text-14 leading-none font-medium text-muted aria-selected:border-ink aria-selected:text-ink"
      />
      <div
        role="tabpanel"
        id={tabPanelId(idBase, item.value)}
        aria-labelledby={tabId(idBase, item.value)}
        // The picture is hidden from assistive technology, so the panel itself takes focus.
        tabIndex={0}
      >
        <div className="relative aspect-video max-w-full overflow-hidden rounded-16 border border-line bg-card bg-dots">
          {item.picture}
        </div>
        <p className="mt-4 max-w-caption text-14 text-muted">
          <b className="font-medium text-ink">{item.label}.</b> {item.caption}
        </p>
      </div>
    </>
  );
}
