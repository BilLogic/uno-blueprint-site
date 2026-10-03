"use client";

import { view as content } from "@/content/view";
import { useView } from "@/hooks/use-view";
import { ViewIcon } from "@/components/view/ViewIcon";
import { RadioMenu } from "@/components/ui/RadioMenu";

export function ViewMenu() {
  const { view, setView } = useView();
  return (
    <RadioMenu
      label={content.label}
      icon={<ViewIcon view={view} />}
      options={content.options}
      value={view}
      onChange={setView}
      menuClassName="w-42"
    />
  );
}
