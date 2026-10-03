"use client";

import { useSyncExternalStore } from "react";
import type { View } from "@/lib/view";

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getView = (): View =>
  document.documentElement.getAttribute("data-view") === "agent" ? "agent" : "human";

function setView(next: View) {
  if (next === getView()) return;
  document.documentElement.setAttribute("data-view", next);
  // The other view starts at its top, not at the scroll position of this one.
  window.scrollTo(0, 0);
  for (const listener of listeners) listener();
}

export function useView(): { view: View; setView: (view: View) => void } {
  const view = useSyncExternalStore(subscribe, getView, () => "human" as const);
  return { view, setView };
}
