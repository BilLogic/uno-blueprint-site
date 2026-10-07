import type { ThemePreference } from "@/lib/theme";
import { links } from "./links";

export const footer = {
  credit: {
    lead: "Built by",
    joiner: "and",
    people: [
      { name: "Bill Guo", link: links.billGuo },
      { name: "Meryem Marasli", link: links.meryemMarasli },
    ],
  },
  /** A portrait in the ideas timeline is licensed on the condition that it is credited. */
  photoCredit: {
    work: { label: "Portrait of Tobi Lütke", link: links.lutkePortrait },
    byline: "by Benjamin Forrest, cropped,",
    licence: { label: "CC BY-SA 4.0", link: links.ccBySa4 },
  },
  themeMenu: {
    label: "Toggle theme",
    options: [
      { value: "dark", label: "Dark" },
      { value: "light", label: "Light" },
      { value: "system", label: "System" },
    ] satisfies readonly { value: ThemePreference; label: string }[],
  },
} as const;
