import { hero } from "@/content/hero";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Container } from "@/components/ui/Container";
import { HeroPicture } from "./HeroPicture";
import { HeroSprite } from "./HeroSprite";

export function Hero() {
  return (
    <section className="isolate pt-32 pb-16 text-center">
      <Container>
        <div className="mx-auto grid max-w-hero justify-items-center gap-6">
          <h1 className="text-display text-balance">{hero.headline}</h1>
          <p className="max-w-lead text-18 text-pretty text-muted">{hero.subheadline}</p>
          <div className="flex flex-wrap gap-2">
            <ButtonLink link={hero.primary.link} variant="primary">
              {hero.primary.label}
            </ButtonLink>
            <ButtonLink link={hero.secondary.link} variant="ghost">
              {hero.secondary.label}
            </ButtonLink>
          </div>
        </div>
        <HeroSprite />
        <HeroPicture />
      </Container>
    </section>
  );
}
