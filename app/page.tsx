import { AgentView } from "@/components/agent/AgentView";
import { CanvasSection } from "@/components/canvas/CanvasSection";
import { Footer } from "@/components/footer/Footer";
import { Hero } from "@/components/hero/Hero";
import { Nav } from "@/components/nav/Nav";
import { TouchPointsSection } from "@/components/touch-points/TouchPointsSection";

export default function Home() {
  return (
    <>
      <Nav />
      <main id="human">
        <Hero />
        <CanvasSection />
        <TouchPointsSection />
      </main>
      <AgentView />
      <Footer />
    </>
  );
}
