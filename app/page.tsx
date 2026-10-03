import { AgentView } from "@/components/agent/AgentView";
import { CanvasSection } from "@/components/canvas/CanvasSection";
import { ClosingBand } from "@/components/closing/ClosingBand";
import { Footer } from "@/components/footer/Footer";
import { GetStarted } from "@/components/get-started/GetStarted";
import { Harness } from "@/components/harness/Harness";
import { Hero } from "@/components/hero/Hero";
import { Nav } from "@/components/nav/Nav";
import { Questions } from "@/components/questions/Questions";
import { TouchPointsSection } from "@/components/touch-points/TouchPointsSection";

export default function Home() {
  return (
    <>
      <Nav />
      <main id="human">
        <Hero />
        <CanvasSection />
        <Harness />
        <TouchPointsSection />
        <GetStarted />
        <Questions />
        <ClosingBand />
      </main>
      <AgentView />
      <Footer />
    </>
  );
}
