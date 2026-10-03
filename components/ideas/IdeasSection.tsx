import { ideas } from "@/content/ideas";
import { Container } from "@/components/ui/Container";
import { PlusCard } from "./PlusCard";
import { Timeline } from "./Timeline";

/**
 * The voices the idea rests on, in date order down a winding line that ends in
 * a real blueprint. A phone skips the timeline: the PLUS card follows the
 * results directly, with no rule between.
 */
export function IdeasSection() {
  return (
    <section id="ideas" className="border-t border-line py-section max-md:border-t-0 max-md:pt-0">
      <Container>
        <div className="mb-12 grid justify-items-center gap-4 text-center max-md:hidden">
          <h2 className="text-title text-balance">{ideas.headline}</h2>
          <p className="max-w-lead text-pretty text-muted">{ideas.sub}</p>
        </div>
        <Timeline end={<PlusCard />} />
      </Container>
    </section>
  );
}
