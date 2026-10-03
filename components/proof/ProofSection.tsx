import { proof } from "@/content/proof";
import { Container } from "@/components/ui/Container";
import { ProofChart } from "./ProofChart";

/**
 * The results: four pairs of bars, without the blueprint and with it. On a
 * phone the ideas timeline is skipped, so the PLUS card below follows this
 * section closely.
 */
export function ProofSection() {
  return (
    <section id="proof" className="border-t border-line py-section max-md:pb-4">
      <Container>
        <div className="mb-head flex items-end justify-between gap-6 max-md:flex-col max-md:items-start max-md:gap-3.5">
          <div className="grid gap-4">
            <h2 className="max-w-heading text-title text-balance">
              <span className="block text-muted">{proof.lead}</span>
              {proof.headline}
            </h2>
            <p className="max-w-lead text-pretty text-muted">{proof.sub}</p>
          </div>
        </div>
        <ProofChart />
      </Container>
    </section>
  );
}
