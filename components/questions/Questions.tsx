import { questions } from "@/content/questions";
import { Container } from "@/components/ui/Container";
import { Question } from "./Question";

export function Questions() {
  return (
    <section aria-labelledby="questions-title" className="border-t border-line py-section">
      <Container>
        <div className="grid grid-cols-[var(--spacing-aside)_minmax(0,1fr)] gap-16 max-lg:grid-cols-1 max-lg:gap-6">
          <h2 id="questions-title" className="max-w-heading text-title text-balance">
            {questions.title}
          </h2>
          <div className="min-w-0">
            {questions.list.map(({ question, answer }) => (
              <Question key={question} question={question} answer={answer} />
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
