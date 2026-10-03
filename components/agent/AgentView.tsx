import { view } from "@/content/view";
import { Container } from "@/components/ui/Container";

/** The page as an agent reads it. The guide itself arrives with the agent view's own change. */
export function AgentView() {
  return (
    <main id="agent" className="py-16">
      <Container>
        <div className="mx-auto mb-2.5 max-w-agent pl-1 font-mono text-12-5 leading-none font-medium text-faint">
          {view.agentFile}
        </div>
        <pre className="mx-auto max-w-agent rounded-16 border border-line bg-panel p-8 font-mono text-14 leading-[1.65] whitespace-pre-wrap" />
      </Container>
    </main>
  );
}
