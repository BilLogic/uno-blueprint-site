import { harness } from "@/content/harness";
import { Container } from "@/components/ui/Container";
import { anchorProps } from "@/components/ui/anchor-props";
import { HarnessShowcase } from "./HarnessShowcase";

export function Harness() {
  return (
    <section aria-labelledby="harness-title" className="py-section">
      <Container>
        {/* A side link drops under the sub-headline on a narrow screen. */}
        <div className="mb-8 flex items-end justify-between gap-6 max-md:flex-col max-md:items-start max-md:gap-3.5">
          <div className="grid gap-4">
            <h2 id="harness-title" className="max-w-[620px] text-title text-balance">
              {harness.headline}
            </h2>
            <p className="max-w-lead text-pretty text-muted">{harness.subheadline}</p>
          </div>
          <a
            {...anchorProps(harness.more.link)}
            className="text-14 whitespace-nowrap text-ink underline underline-offset-3"
          >
            {harness.more.label}
          </a>
        </div>
        <HarnessShowcase />
      </Container>
    </section>
  );
}
