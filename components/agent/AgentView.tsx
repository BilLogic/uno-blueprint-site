import { agentGuide } from "@/content/agent";
import { view } from "@/content/view";
import { Container } from "@/components/ui/Container";

/** The page as an agent reads it: the guide's markdown, shown as plain text. */
export function AgentView() {
  return (
    <main id="agent" className="py-16">
      <Container>
        {/* The file name is this view's heading: the human page's h1 is hidden here. */}
        <h1 className="mx-auto mb-2.5 max-w-agent pl-1 font-mono text-12 leading-label font-medium text-muted">
          {view.agentFile}
        </h1>
        {/* Long URLs break only where they would overflow a phone's column. */}
        <pre className="mx-auto max-w-agent rounded-16 border border-line bg-panel p-8 font-mono text-14 leading-code wrap-break-word whitespace-pre-wrap">
          {agentGuide}
        </pre>
      </Container>
    </main>
  );
}
