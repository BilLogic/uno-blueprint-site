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
  themeMenu: {
    label: "Toggle theme",
    options: [
      { value: "dark", label: "Dark" },
      { value: "light", label: "Light" },
      { value: "system", label: "System" },
    ] satisfies readonly { value: ThemePreference; label: string }[],
  },
} as const;
