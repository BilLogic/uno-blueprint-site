import { AgentView } from "@/components/agent/AgentView";
import { Footer } from "@/components/footer/Footer";
import { Hero } from "@/components/hero/Hero";
import { Nav } from "@/components/nav/Nav";
import { StructureSection } from "@/components/structure/StructureSection";

export default function Home() {
  return (
    <>
      <Nav />
      <main id="human">
        <Hero />
        <StructureSection />
      </main>
      <AgentView />
      <Footer />
    </>
  );
}
