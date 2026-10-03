"use client";

import { Moon, Sun } from "lucide-react";
import { footer } from "@/content/footer";
import { useTheme } from "@/hooks/use-theme";
import { RadioMenu } from "@/components/ui/RadioMenu";

export function ThemeMenu() {
  const { preference, resolved, setPreference } = useTheme();
  const Icon = resolved === "dark" ? Moon : Sun;
  return (
    <RadioMenu
      label={footer.themeMenu.label}
      icon={<Icon aria-hidden strokeWidth={1.75} />}
      options={footer.themeMenu.options}
      value={preference}
      onChange={setPreference}
      menuClassName="w-60"
    />
  );
}
