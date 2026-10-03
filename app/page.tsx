import { AgentView } from "@/components/agent/AgentView";
import { Footer } from "@/components/footer/Footer";
import { Hero } from "@/components/hero/Hero";
import { IdeasSection } from "@/components/ideas/IdeasSection";
import { Nav } from "@/components/nav/Nav";
import { ProofSection } from "@/components/proof/ProofSection";

export default function Home() {
  return (
    <>
      <Nav />
      <main id="human">
        <Hero />
        <ProofSection />
        <IdeasSection />
      </main>
      <AgentView />
      <Footer />
    </>
  );
}
