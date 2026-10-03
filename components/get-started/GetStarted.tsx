import { getStarted } from "@/content/get-started";
import { Container } from "@/components/ui/Container";
import { CopyButton } from "./CopyButton";
import { InstallStep } from "./InstallStep";
import { SkillsStep } from "./SkillsStep";
import { StepLabel, StepSub, revealCopy } from "./step-parts";

const { title, sub, prompts } = getStarted;

/** Install, the skills and a few prompts to start with, beside the section's heading. */
export function GetStarted() {
  return (
    <section id={getStarted.id} aria-labelledby={getStarted.titleId} className="scroll-mt-16 border-t border-line py-section">
      <Container>
        <div className="grid grid-cols-[var(--spacing-aside)_minmax(0,1fr)] gap-16 max-lg:grid-cols-1 max-lg:gap-6">
          <div className="grid min-w-0 content-start gap-4">
            <h2 id={getStarted.titleId} className="max-w-heading text-title text-balance">
              <span className="block text-muted">{title.lead}</span>
              {title.rest}
            </h2>
            <p className="max-w-lead text-pretty text-muted">{sub}</p>
          </div>
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-12">
            <InstallStep />
            <SkillsStep />
            <div className="grid min-w-0 gap-3.5">
              <StepLabel>{prompts.label}</StepLabel>
              <StepSub>{prompts.sub}</StepSub>
              <ul className="grid gap-5.5">
                {prompts.list.map(({ title: name, prompt }) => (
                  <li key={name} className="grid gap-2">
                    <h4 className="text-14 leading-label font-medium">{name}</h4>
                    <div className="group relative grid rounded-12 border border-line bg-panel py-3.5 pr-13 pl-4">
                      <p className="text-14 text-muted">{prompt}</p>
                      <CopyButton text={prompt} tone="panel" className={`top-2.5 right-2.5 ${revealCopy}`} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
