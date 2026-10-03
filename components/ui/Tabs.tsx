"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { nextTabIndex } from "@/lib/menu-keys";

export type Tab<T extends string> = { value: T; label: string; icon?: ReactNode };

/** The id of a tab, and of the panel it controls, under one row's `idBase`. */
export const tabId = (idBase: string, value: string) => `${idBase}-tab-${value}`;
export const tabPanelId = (idBase: string, value: string) => `${idBase}-panel-${value}`;

type TabListProps<T extends string> = {
  id?: string;
  label: string;
  /** Prefix for the tab and panel ids; the caller renders the selected tab's panel with `tabPanelId`. */
  idBase: string;
  tabs: readonly Tab<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  tabClassName?: string;
};

/**
 * A row of tabs following the WAI-ARIA tabs pattern with automatic
 * activation: one tab is in the tab order, arrows move and select, Home and
 * End jump to either end. The look comes from the caller's classes; the
 * selected tab carries `aria-selected="true"` to style against.
 */
export function TabList<T extends string>({
  id,
  label,
  idBase,
  tabs,
  value,
  onChange,
  className,
  tabClassName,
}: TabListProps<T>) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const current = Math.max(
    tabs.findIndex((tab) => tab.value === value),
    0,
  );

  function onKeyDown(event: KeyboardEvent) {
    const next = nextTabIndex(event.key, current, tabs.length);
    const tab = next === null ? undefined : tabs[next];
    if (next === null || !tab) return;
    event.preventDefault();
    onChange(tab.value);
    buttons.current[next]?.focus();
  }

  return (
    <div id={id} role="tablist" aria-label={label} className={className} onKeyDown={onKeyDown}>
      {tabs.map((tab, index) => {
        const selected = index === current;
        return (
          <button
            key={tab.value}
            ref={(node) => {
              buttons.current[index] = node;
            }}
            type="button"
            role="tab"
            id={tabId(idBase, tab.value)}
            aria-selected={selected}
            // Only the selected tab's panel is rendered, so only it is referenced.
            aria-controls={selected ? tabPanelId(idBase, tab.value) : undefined}
            tabIndex={selected ? 0 : -1}
            className={tabClassName}
            onClick={() => onChange(tab.value)}
          >
            {tab.icon}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
