import { AgentView } from "@/components/agent/AgentView";
import { ClosingBand } from "@/components/closing/ClosingBand";
import { Footer } from "@/components/footer/Footer";
import { GetStarted } from "@/components/get-started/GetStarted";
import { Hero } from "@/components/hero/Hero";
import { IdeasSection } from "@/components/ideas/IdeasSection";
import { Nav } from "@/components/nav/Nav";
import { ProofSection } from "@/components/proof/ProofSection";
import { Questions } from "@/components/questions/Questions";

export default function Home() {
  return (
    <>
      <Nav />
      <main id="human">
        <Hero />
        <ProofSection />
        <IdeasSection />
        <GetStarted />
        <Questions />
        <ClosingBand />
      </main>
      <AgentView />
      <Footer />
    </>
  );
}
