export { THEME_COLORS, THEME_STORAGE_KEY, themeBootScript } from "./theme-boot.mjs";

export const THEME_PREFERENCES = ["dark", "light", "system"] as const;

export type ThemePreference = (typeof THEME_PREFERENCES)[number];
export type ResolvedTheme = Exclude<ThemePreference, "system">;

/** Anything stored that is not an explicit pick means "follow the system". */
export function parseThemePreference(value: unknown): ThemePreference {
  return value === "dark" || value === "light" ? value : "system";
}

export function resolveTheme(
  preference: ThemePreference,
  systemPrefersDark: boolean,
): ResolvedTheme {
  if (preference !== "system") return preference;
  return systemPrefersDark ? "dark" : "light";
}
