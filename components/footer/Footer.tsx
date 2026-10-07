import { footer } from "@/content/footer";
import { Container } from "@/components/ui/Container";
import { anchorProps } from "@/components/ui/anchor-props";
import { ThemeMenu } from "./ThemeMenu";
import { ViewMenu } from "./ViewMenu";

export function Footer() {
  const { lead, joiner, people } = footer.credit;
  const [first, second] = people;
  return (
    <footer className="pb-7">
      {/* The hairline stops at the gutters, so it is drawn inside the column rather than as a border. */}
      <Container className="relative flex flex-wrap items-center justify-between gap-5 pt-7 text-14 text-muted before:absolute before:inset-x-gutter before:top-0 before:border-t before:border-line">
        <span>
          {lead} <PersonLink person={first} /> {joiner} <PersonLink person={second} />
        </span>
        <div className="flex items-center gap-1.5">
          <ViewMenu />
          <ThemeMenu />
        </div>
        <PhotoCredit />
      </Container>
    </footer>
  );
}

function PersonLink({ person }: { person: (typeof footer.credit.people)[number] }) {
  return (
    <a
      {...anchorProps(person.link)}
      className="inline-block py-2 text-ink underline underline-offset-3"
    >
      {person.name}
    </a>
  );
}

/** On its own line under the credits, and smaller: it credits a photo, not the site. */
function PhotoCredit() {
  const { work, rest, licence } = footer.photoCredit;
  return (
    <p className="basis-full text-12 text-muted">
      <a {...anchorProps(work.link)} className="underline underline-offset-3">
        {work.label}
      </a>{" "}
      {rest}{" "}
      <a {...anchorProps(licence.link)} className="underline underline-offset-3">
        {licence.label}
      </a>
    </p>
  );
}
