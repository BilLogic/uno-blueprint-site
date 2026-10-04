import { closing } from "@/content/closing";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Container } from "@/components/ui/Container";

/** The last word before the footer: the two ways in, again. */
export function ClosingBand() {
  return (
    <section aria-labelledby="closing-title" className="border-t border-line pt-section pb-32 text-center">
      <Container>
        <div className="grid justify-items-center gap-6">
          <h2 id="closing-title" className="text-title text-balance">
            {closing.title}
          </h2>
          <div className="flex flex-wrap gap-2">
            <ButtonLink link={closing.primary.link} variant="primary">
              {closing.primary.label}
            </ButtonLink>
            <ButtonLink link={closing.secondary.link} variant="ghost">
              {closing.secondary.label}
            </ButtonLink>
          </div>
        </div>
      </Container>
    </section>
  );
}
