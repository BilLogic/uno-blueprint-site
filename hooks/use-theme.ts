"use client";

import { useSyncExternalStore } from "react";
import {
  THEME_COLORS,
  THEME_STORAGE_KEY,
  parseThemePreference,
  resolveTheme,
  type ResolvedTheme,
  type ThemePreference,
} from "@/lib/theme";

type ThemeState = { preference: ThemePreference; resolved: ResolvedTheme };

const DARK_QUERY = "(prefers-color-scheme: dark)";
const SERVER_STATE: ThemeState = { preference: "system", resolved: "light" };
const listeners = new Set<() => void>();
let snapshot: ThemeState = SERVER_STATE;

function readStored(): ThemePreference {
  try {
    return parseThemePreference(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return "system";
  }
}

/** The browser chrome follows a manual pick; on "system" each meta goes back to its own media. */
function syncThemeColor(preference: ThemePreference) {
  for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
    const ownTheme = meta.getAttribute("media")?.includes("dark") ? "dark" : "light";
    meta.setAttribute("content", THEME_COLORS[preference === "system" ? ownTheme : preference]);
  }
}

function apply(preference: ThemePreference) {
  const root = document.documentElement;
  if (preference === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", preference);
  syncThemeColor(preference);
}

function getSnapshot(): ThemeState {
  const preference = parseThemePreference(document.documentElement.getAttribute("data-theme"));
  const resolved = resolveTheme(preference, matchMedia(DARK_QUERY).matches);
  // Same object while nothing changed, as useSyncExternalStore requires.
  if (preference !== snapshot.preference || resolved !== snapshot.resolved) {
    snapshot = { preference, resolved };
  }
  return snapshot;
}

function notify() {
  for (const listener of listeners) listener();
}

function onStorage(event: StorageEvent) {
  // Another tab changed the pick: follow it here too.
  if (event.key !== THEME_STORAGE_KEY) return;
  apply(readStored());
  notify();
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) {
    // React renders the theme-color metas afresh on hydration, after the boot script pointed them.
    syncThemeColor(getSnapshot().preference);
    matchMedia(DARK_QUERY).addEventListener("change", notify);
    window.addEventListener("storage", onStorage);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size > 0) return;
    matchMedia(DARK_QUERY).removeEventListener("change", notify);
    window.removeEventListener("storage", onStorage);
  };
}

function setPreference(preference: ThemePreference) {
  try {
    if (preference === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Storage can be off (private mode); the pick still applies to this visit.
  }
  apply(preference);
  notify();
}

export function useTheme(): ThemeState & { setPreference: (preference: ThemePreference) => void } {
  const state = useSyncExternalStore(subscribe, getSnapshot, () => SERVER_STATE);
  return { ...state, setPreference };
}
