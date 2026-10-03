import { AgentView } from "@/components/agent/AgentView";
import { ClosingBand } from "@/components/closing/ClosingBand";
import { Footer } from "@/components/footer/Footer";
import { GetStarted } from "@/components/get-started/GetStarted";
import { Hero } from "@/components/hero/Hero";
import { Nav } from "@/components/nav/Nav";
import { Questions } from "@/components/questions/Questions";
import { StructureSection } from "@/components/structure/StructureSection";

export default function Home() {
  return (
    <>
      <Nav />
      <main id="human">
        <Hero />
        <StructureSection />
        <GetStarted />
        <Questions />
        <ClosingBand />
      </main>
      <AgentView />
      <Footer />
    </>
  );
}
