import { harness } from "@/content/harness";
import { Container } from "@/components/ui/Container";
import { SectionHead } from "@/components/ui/SectionHead";
import { HarnessShowcase } from "./HarnessShowcase";

export function Harness() {
  return (
    <section aria-label={harness.headline} className="py-section">
      <Container>
        <SectionHead
          headline={harness.headline}
          subheadline={harness.subheadline}
          more={harness.more}
          className="mb-8"
        />
        <HarnessShowcase />
      </Container>
    </section>
  );
}
