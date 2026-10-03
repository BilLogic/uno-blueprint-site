import { AgentView } from "@/components/agent/AgentView";
import { Bento } from "@/components/bento/Bento";
import { CanvasSection } from "@/components/canvas/CanvasSection";
import { ClosingBand } from "@/components/closing/ClosingBand";
import { Footer } from "@/components/footer/Footer";
import { GetStarted } from "@/components/get-started/GetStarted";
import { Harness } from "@/components/harness/Harness";
import { Hero } from "@/components/hero/Hero";
import { IdeasSection } from "@/components/ideas/IdeasSection";
import { Nav } from "@/components/nav/Nav";
import { ProofSection } from "@/components/proof/ProofSection";
import { Questions } from "@/components/questions/Questions";
import { TouchPointsSection } from "@/components/touch-points/TouchPointsSection";
import { Container } from "@/components/ui/Container";
import { bento } from "@/content/bento";

export default function Home() {
  return (
    <>
      <Nav />
      <main id="human">
        <Hero />
        {/*
          The bento follows the structure walkthrough inside StructureSection,
          under that section's heading; it moves there, without this stand-in
          heading, when that lands.
        */}
        <section className="py-section">
          <Container>
            <h2 className="sr-only">{bento.heading}</h2>
            <Bento />
          </Container>
        </section>
        <CanvasSection />
        <Harness />
        <TouchPointsSection />
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
