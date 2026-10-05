import type { LucideIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { Container } from "@/components/ui/Container";
import { SectionHead } from "@/components/ui/SectionHead";
import { Showcase } from "./Showcase";

type ShowcaseSectionProps<T extends string> = {
  head: Omit<ComponentProps<typeof SectionHead>, "className">;
  idBase: string;
  /** Names the tab row for assistive technology. */
  tabsLabel: string;
  tabs: readonly { value: T; label: string; caption: string; recording: string }[];
  /** Each tab's icon component. */
  icons: Record<T, LucideIcon>;
  /** The tab whose recording is a phone's, played inside a handset. */
  handset?: T;
};

/** A section that is a headline over a showcase: tabs, a stage with a recording, and a caption. */
export function ShowcaseSection<T extends string>({ head, idBase, tabsLabel, tabs, icons, handset }: ShowcaseSectionProps<T>) {
  return (
    <section className="py-section">
      <Container>
        <SectionHead {...head} className="mb-8" />
        <Showcase
          idBase={idBase}
          label={tabsLabel}
          items={tabs.map((tab) => {
            const Icon: LucideIcon = icons[tab.value];
            return { ...tab, icon: <Icon className="size-4" aria-hidden />, handset: tab.value === handset };
          })}
        />
      </Container>
    </section>
  );
}
